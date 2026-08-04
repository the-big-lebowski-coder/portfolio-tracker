import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { PlusCircle, CalendarIcon, Loader2 } from "lucide-react";

import {
  useCreateRonaTransaction,
  getGetRonaBalanceQueryKey,
  getListRonaTransactionsQueryKey,
  getGetRonaSummaryQueryKey,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  date: z.date({
    required_error: "Date is required",
  }),
});

const INCOME_CATEGORIES = ["Allowance", "Gift", "Helping at home", "Other"];
const EXPENSE_CATEGORIES = ["Toys", "Food", "Games", "Clothes", "Other"];

export function TransactionForm() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTransaction = useCreateRonaTransaction();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "income",
      amount: undefined,
      description: "",
      category: "",
      date: new Date(),
    },
  });

  const transactionType = form.watch("type");
  const categories = transactionType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function onSubmit(values: z.infer<typeof formSchema>) {
    createTransaction.mutate({
      data: {
        ...values,
        date: format(values.date, "yyyy-MM-dd"),
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Added!",
          description: "Rona's piggy bank is ringing!",
        });

        queryClient.invalidateQueries({ queryKey: getListRonaTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRonaBalanceQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRonaSummaryQueryKey() });

        setOpen(false);
        form.reset({
          type: "income",
          amount: 0,
          description: "",
          category: "",
          date: new Date(),
        });
      },
      onError: () => {
        toast({
          title: "Oops!",
          description: "Something went wrong. Try again.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-full shadow-lg h-14 px-8 text-lg gap-2 group transition-all hover:scale-105">
          <PlusCircle className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <DialogHeader className="bg-muted/50 p-6 pb-4">
          <DialogTitle className="text-2xl font-bold text-foreground">New Transaction</DialogTitle>
          <DialogDescription className="text-base">
            Got money or spent some? Let's record it!
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 p-6 pt-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={field.value === "income" ? "default" : "outline"}
                      className={cn("w-full rounded-2xl h-12 text-base font-semibold",
                        field.value === "income" ? "bg-emerald-500 hover:bg-emerald-600 shadow-md text-white border-none" : "border-2"
                      )}
                      onClick={() => {
                        field.onChange("income");
                        form.setValue("category", "");
                      }}
                    >
                      Income
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "expense" ? "default" : "outline"}
                      className={cn("w-full rounded-2xl h-12 text-base font-semibold",
                        field.value === "expense" ? "bg-rose-500 hover:bg-rose-600 shadow-md text-white border-none" : "border-2"
                      )}
                      onClick={() => {
                        field.onChange("expense");
                        form.setValue("category", "");
                      }}
                    >
                      Expense
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          className="pl-7 h-12 rounded-xl text-lg font-medium"
                          {...field}
                          value={field.value || ""}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mt-[2px] mb-[6px]">Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "h-12 w-full pl-3 text-left font-normal rounded-xl border-2",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "M/d/yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl border-2 font-medium">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What was it for?"
                      className="h-12 rounded-xl font-medium"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg"
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
