// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AuddTreasury
/// @notice AI-governed smart treasury + automated payroll for BOT Chain.
///         A human owner sets policy (agent address, spend guardrails, employee
///         allow-list). An autonomous agent executes payroll and streams, but is
///         hard-bounded on-chain: it can only pay allow-listed active employees,
///         only in enabled tokens, and only within per-transaction and daily caps.
///         Native BOT is represented by address(0).
contract AuddTreasury is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant NATIVE = address(0);

    /// @notice The autonomous agent signer authorized to execute bounded actions.
    address public agent;

    struct Employee {
        address wallet;
        string name;
        string role;
        uint256 salary; // reference monthly salary, in salaryToken base units
        address salaryToken; // NATIVE (0) or aUSD
        bool active;
        uint256 addedAt;
    }

    mapping(address => Employee) public employees;
    address[] public employeeList;

    // Guardrails per token. A token is only spendable by the agent flow when both
    // caps are > 0. Owner-only withdraw bypasses caps (full human control).
    mapping(address => uint256) public perTxCap;
    mapping(address => uint256) public dailyCap;
    mapping(address => mapping(uint256 => uint256)) public spentOnDay; // token => dayIndex => spent

    struct Stream {
        address to;
        address token;
        uint256 ratePerSecond;
        uint256 start;
        uint256 stop; // 0 = open-ended
        uint256 lastClaim;
        uint256 claimed;
        bool active;
    }

    Stream[] public streams;

    struct Intent {
        uint256 id;
        address executor;
        string category; // "payroll" | "stream" | "treasury" | ...
        string summary; // human-readable summary of the executed intent
        uint256 timestamp;
    }

    Intent[] public intents;

    event AgentUpdated(address indexed agent);
    event GuardrailUpdated(address indexed token, uint256 perTxCap, uint256 dailyCap);
    event EmployeeAdded(address indexed wallet, string name);
    event EmployeeUpdated(address indexed wallet, bool active);
    event Deposited(address indexed token, address indexed from, uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event PaymentSent(uint256 indexed intentId, address indexed token, address indexed to, uint256 amount);
    event StreamCreated(uint256 indexed streamId, address indexed to, address indexed token, uint256 ratePerSecond);
    event StreamClaimed(uint256 indexed streamId, address indexed to, uint256 amount);
    event StreamStopped(uint256 indexed streamId);
    event IntentLogged(uint256 indexed id, address indexed executor, string category, string summary);

    modifier onlyAgentOrOwner() {
        require(msg.sender == agent || msg.sender == owner(), "Audd: not authorized");
        _;
    }

    constructor(address initialOwner, address initialAgent) Ownable(initialOwner) {
        agent = initialAgent;
        emit AgentUpdated(initialAgent);
    }

    receive() external payable {
        emit Deposited(NATIVE, msg.sender, msg.value);
    }

    // ----------------------------------------------------------------- admin --
    function setAgent(address a) external onlyOwner {
        agent = a;
        emit AgentUpdated(a);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setGuardrail(address token, uint256 _perTxCap, uint256 _dailyCap) external onlyOwner {
        perTxCap[token] = _perTxCap;
        dailyCap[token] = _dailyCap;
        emit GuardrailUpdated(token, _perTxCap, _dailyCap);
    }

    function addEmployee(
        address wallet,
        string calldata name,
        string calldata role,
        uint256 salary,
        address salaryToken
    ) external onlyOwner {
        require(wallet != address(0), "Audd: bad wallet");
        if (employees[wallet].wallet == address(0)) {
            employeeList.push(wallet);
        }
        employees[wallet] = Employee(wallet, name, role, salary, salaryToken, true, block.timestamp);
        emit EmployeeAdded(wallet, name);
    }

    function setEmployeeActive(address wallet, bool active) external onlyOwner {
        require(employees[wallet].wallet != address(0), "Audd: no employee");
        employees[wallet].active = active;
        emit EmployeeUpdated(wallet, active);
    }

    function depositERC20(address token, uint256 amount) external {
        require(token != NATIVE, "Audd: use native deposit");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(token, msg.sender, amount);
    }

    function withdraw(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        _transferOut(token, to, amount);
        emit Withdrawn(token, to, amount);
    }

    // ------------------------------------------------------------ agent flow --
    /// @notice Log a human-readable intent that the agent (or owner) is executing.
    function logIntent(string memory category, string memory summary)
        public
        onlyAgentOrOwner
        returns (uint256 id)
    {
        id = intents.length;
        intents.push(Intent(id, msg.sender, category, summary, block.timestamp));
        emit IntentLogged(id, msg.sender, category, summary);
    }

    /// @notice Pay a single active employee, subject to guardrails.
    function pay(address token, address to, uint256 amount, uint256 intentId)
        public
        onlyAgentOrOwner
        whenNotPaused
        nonReentrant
    {
        require(employees[to].active, "Audd: recipient not active employee");
        _checkAndAccount(token, amount);
        _transferOut(token, to, amount);
        emit PaymentSent(intentId, token, to, amount);
    }

    /// @notice Log intent + run a payroll batch atomically. Returns the intent id.
    function executePayroll(
        address token,
        address[] calldata to,
        uint256[] calldata amounts,
        string calldata summary
    ) external onlyAgentOrOwner whenNotPaused nonReentrant returns (uint256 intentId) {
        require(to.length == amounts.length && to.length > 0, "Audd: bad batch");
        intentId = logIntent("payroll", summary);
        for (uint256 i = 0; i < to.length; i++) {
            require(employees[to[i]].active, "Audd: recipient not active employee");
            _checkAndAccount(token, amounts[i]);
            _transferOut(token, to[i], amounts[i]);
            emit PaymentSent(intentId, token, to[i], amounts[i]);
        }
    }

    /// @notice Create a continuous salary stream to an active employee.
    function createStream(
        address token,
        address to,
        uint256 ratePerSecond,
        uint256 stop,
        string calldata summary
    ) external onlyAgentOrOwner whenNotPaused returns (uint256 id) {
        require(employees[to].active, "Audd: recipient not active employee");
        require(ratePerSecond > 0, "Audd: zero rate");
        require(dailyCap[token] > 0, "Audd: token not enabled");
        require(stop == 0 || stop > block.timestamp, "Audd: bad stop");
        id = streams.length;
        streams.push(Stream(to, token, ratePerSecond, block.timestamp, stop, block.timestamp, 0, true));
        logIntent("stream", summary);
        emit StreamCreated(id, to, token, ratePerSecond);
    }

    /// @notice Amount currently claimable from a stream (bounded by treasury balance).
    function claimable(uint256 id) public view returns (uint256) {
        Stream memory s = streams[id];
        if (!s.active) return 0;
        uint256 end = block.timestamp;
        if (s.stop != 0 && end > s.stop) end = s.stop;
        if (end <= s.lastClaim) return 0;
        uint256 amt = (end - s.lastClaim) * s.ratePerSecond;
        uint256 bal = balanceOf(s.token);
        if (amt > bal) amt = bal;
        return amt;
    }

    /// @notice Push accrued stream funds to the employee. Callable by anyone.
    function claimStream(uint256 id) public nonReentrant whenNotPaused {
        Stream storage s = streams[id];
        require(s.active, "Audd: inactive stream");
        uint256 amt = claimable(id);
        require(amt > 0, "Audd: nothing to claim");
        uint256 end = block.timestamp;
        if (s.stop != 0 && end > s.stop) end = s.stop;
        s.lastClaim = end;
        s.claimed += amt;
        _transferOut(s.token, s.to, amt);
        emit StreamClaimed(id, s.to, amt);
        if (s.stop != 0 && block.timestamp >= s.stop) {
            s.active = false;
        }
    }

    function stopStream(uint256 id) external onlyAgentOrOwner {
        Stream storage s = streams[id];
        require(s.active, "Audd: inactive stream");
        if (s.stop == 0 || s.stop > block.timestamp) {
            s.stop = block.timestamp;
        }
        emit StreamStopped(id);
    }

    // ---------------------------------------------------------------- views ---
    function employeeCount() external view returns (uint256) {
        return employeeList.length;
    }

    function streamCount() external view returns (uint256) {
        return streams.length;
    }

    function intentCount() external view returns (uint256) {
        return intents.length;
    }

    function dayIndex() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function spentToday(address token) external view returns (uint256) {
        return spentOnDay[token][block.timestamp / 1 days];
    }

    function balanceOf(address token) public view returns (uint256) {
        if (token == NATIVE) return address(this).balance;
        return IERC20(token).balanceOf(address(this));
    }

    function getEmployees() external view returns (Employee[] memory list) {
        list = new Employee[](employeeList.length);
        for (uint256 i = 0; i < employeeList.length; i++) {
            list[i] = employees[employeeList[i]];
        }
    }

    function getStreams() external view returns (Stream[] memory) {
        return streams;
    }

    function getIntents() external view returns (Intent[] memory) {
        return intents;
    }

    // ------------------------------------------------------------- internal ---
    function _checkAndAccount(address token, uint256 amount) internal {
        require(amount > 0, "Audd: zero amount");
        uint256 ptc = perTxCap[token];
        require(ptc > 0 && amount <= ptc, "Audd: over per-tx cap");
        uint256 dc = dailyCap[token];
        uint256 d = block.timestamp / 1 days;
        uint256 spent = spentOnDay[token][d];
        require(dc > 0 && spent + amount <= dc, "Audd: over daily cap");
        spentOnDay[token][d] = spent + amount;
    }

    function _transferOut(address token, address to, uint256 amount) internal {
        require(to != address(0), "Audd: bad recipient");
        if (token == NATIVE) {
            (bool ok, ) = payable(to).call{value: amount}("");
            require(ok, "Audd: native transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
