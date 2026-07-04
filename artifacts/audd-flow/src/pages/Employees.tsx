import { useState } from "react";
import { useListEmployees, useAddEmployee, useUpdateEmployee, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, UserX, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, type Variants } from "framer-motion";

export default function Employees() {
  const { data: employees, isLoading } = useListEmployees();
  const queryClient = useQueryClient();
  const updateEmployee = useUpdateEmployee();
  
  const handleToggleActive = (address: string, active: boolean) => {
    updateEmployee.mutate(
      { address, data: { active } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          toast.success(`Employee ${active ? 'activated' : 'deactivated'}`);
        },
        onError: (err: any) => toast.error(err.message || "Failed to update employee")
      }
    );
  };

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <TopBar title="Team" />
      <div className="flex-1 px-6 pt-32 pb-6 space-y-6 flex flex-col">
        <div className="flex justify-between items-center">
          <h2 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest ml-2">Allow-list</h2>
          <AddEmployeeDialog />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pb-20">
          {isLoading ? (
             <div className="space-y-4">
               {[1,2,3].map(i => (
                 <Skeleton key={i} className="h-24 w-full rounded-[2rem] bg-white/[0.03]" />
               ))}
             </div>
          ) : employees?.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-white/50 py-12 glass-card rounded-[2rem]">
              <p className="font-light">No employees found.</p>
            </motion.div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              {employees?.map((emp) => (
                <motion.div 
                  variants={item}
                  key={emp.address} 
                  className={cn(
                    "glass-card rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,255,255,0.1)] hover:border-primary/30", 
                    !emp.active && "opacity-50 hover:opacity-100"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-light text-white leading-tight">{emp.name}</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{emp.role}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(emp.address, !emp.active)}
                      className="h-10 w-10 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05]"
                      disabled={updateEmployee.isPending}
                      data-testid={`toggle-employee-${emp.address}`}
                    >
                      {emp.active ? <UserX className="w-4 h-4 text-white/40 hover:text-destructive transition-colors" /> : <UserCheck className="w-4 h-4 text-white/40 hover:text-primary transition-colors" />}
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] text-white/50 font-mono tracking-widest truncate max-w-[150px]">
                      {emp.address.slice(0,6)}...{emp.address.slice(-4)}
                    </div>
                    <div className="text-right flex items-baseline gap-2">
                      <span className="text-2xl font-light text-white tracking-tight">{emp.salaryFormatted}</span>
                      <span className="text-sm font-medium text-white/50">{emp.salarySymbol}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  
  const queryClient = useQueryClient();
  const addEmployee = useAddEmployee();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addEmployee.mutate(
      { data: { name, address, role, salary, token: "aUSD" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          toast.success("Employee added");
          setOpen(false);
          setName(""); setAddress(""); setRole(""); setSalary("");
        },
        onError: (err: any) => toast.error(err.message || "Failed to add employee")
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="h-10 w-10 rounded-full bg-white/[0.05] border border-white/[0.1] text-white hover:bg-primary hover:text-black hover:shadow-[0_0_15px_rgba(0,255,255,0.6)] transition-all duration-300" data-testid="button-add-employee-dialog">
          <Plus className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/90 border-white/10 backdrop-blur-2xl sm:max-w-md rounded-[2rem] p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white font-light tracking-tight">Add Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
             <label className="text-[10px] text-white/40 uppercase tracking-widest ml-2">Name</label>
             <Input value={name} onChange={e => setName(e.target.value)} required className="bg-white/[0.03] border-white/[0.1] focus-visible:border-primary/50 focus-visible:ring-0 rounded-2xl h-12 text-white px-4 font-light" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] text-white/40 uppercase tracking-widest ml-2">Address</label>
             <Input value={address} onChange={e => setAddress(e.target.value)} required className="bg-white/[0.03] border-white/[0.1] focus-visible:border-primary/50 focus-visible:ring-0 rounded-2xl h-12 text-white font-mono text-sm px-4" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] text-white/40 uppercase tracking-widest ml-2">Role</label>
             <Input value={role} onChange={e => setRole(e.target.value)} required className="bg-white/[0.03] border-white/[0.1] focus-visible:border-primary/50 focus-visible:ring-0 rounded-2xl h-12 text-white px-4 font-light" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] text-white/40 uppercase tracking-widest ml-2">Salary (aUSD / month)</label>
             <Input value={salary} onChange={e => setSalary(e.target.value)} required type="number" step="0.01" className="bg-white/[0.03] border-white/[0.1] focus-visible:border-primary/50 focus-visible:ring-0 rounded-2xl h-12 text-white px-4 font-light" />
          </div>
          <Button type="submit" disabled={addEmployee.isPending} className="w-full bg-primary text-black hover:bg-primary hover:shadow-[0_0_15px_rgba(0,255,255,0.6)] rounded-2xl mt-6 h-12 text-sm font-medium transition-all duration-300">
            {addEmployee.isPending ? "Adding..." : "Add Employee"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
