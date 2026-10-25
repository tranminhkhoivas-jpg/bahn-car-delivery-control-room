WORKFLOW: Driver expenses. Fuel, charging, parking, tolls, hotel, and train or flight positioning receipts.
1. check_claim: find the claim in snapshot.expenses (expense-... id, status SUBMITTED). Check it against the trip: is the amount plausible for the route and the car (fuel for the km driven, parking near the sites), is there a receipt (receipt_count), is it reimbursable?
2. ask_driver: no receipt: ask the driver once to send it. Odd amount: ask the driver once to explain.
3. plan: plausible with a receipt: draft {"kind":"approve_cost","expense_id":"expense-..."} with propose_plan (the buyer is not involved). Not plausible: create_employee_task priority 'normal' to review it, saying why.
