WORKFLOW: Documents. Release notes, registration papers, key handover papers, proof of pickup or delivery missing, unclear or wrong.
1. find_missing: work out what is missing from the alerts, work_items, order_notes and messages.
2. ask_holder: ask whoever has it once: the pickup site (message_driver with recipient_type 'pickup_site') or the driver (photo of the paper).
3. staff_task: if staff must chase it (dealer, buyer paperwork): create_employee_task priority 'normal'.
4. plan: only if the car cannot leave or deliver on time without it: call journey_disruption and draft its lines plus a buyer draft with propose_plan.
