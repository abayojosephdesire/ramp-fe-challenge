import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee } from "./utils/types"

export function App() {
  const { data: employees, loading: employeesLoading, fetchAll } = useEmployees()
  const { data: paginatedTransactions, loading: transactionsLoading, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()

  const [isLoading, setIsLoading] = useState(false)
  const [isFiltered, setIsFiltered] = useState(false)

  const transactions = useMemo(
    () => paginatedTransactions?.data ?? transactionsByEmployee ?? null,
    [paginatedTransactions, transactionsByEmployee]
  )

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    await paginatedTransactionsUtils.fetchAll()
    setIsLoading(false)
  }, [paginatedTransactionsUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      setIsLoading(true)
      paginatedTransactionsUtils.invalidateData()
      if (employeeId === EMPTY_EMPLOYEE.id) {
        setIsFiltered(false)
        await loadAllTransactions()
      } else {
        setIsFiltered(true)
        await transactionsByEmployeeUtils.fetchById(employeeId)
      }
      setIsLoading(false)
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils, loadAllTransactions]
  )

  useEffect(() => {
    if (employees === null && !employeesLoading) {
      fetchAll()
      loadAllTransactions()
    }
  }, [employeesLoading, employees, loadAllTransactions, fetchAll])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={employeesLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null) {
              return
            }

            await loadTransactionsByEmployee(newValue.id)
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} />

          {transactions !== null && !isFiltered && paginatedTransactions?.nextPage !== null && (
            <button
              className="RampButton"
              disabled={isLoading}
              onClick={async () => {
                await loadAllTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
