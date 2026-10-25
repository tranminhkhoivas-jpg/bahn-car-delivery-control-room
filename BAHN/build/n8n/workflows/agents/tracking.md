WORKFLOW: Tracking problems. Tracking gaps, missing or odd GPS positions.
1. gap_check: call check_journey. tracking.normal says whether the gap is normal (ferry crossing, planned hotel stop, before the pickup slot, or under the normal gap) and why; tracking.stopped says the car has made no progress. Normal: raise no alarm; close_case if no other workflow is on the event.
2. driver_check: not normal: ask the driver once for position and ETA.
3. escalate: "(no reply)": create_employee_task with the last known position, priority 'urgent' (code lowers it to 'top' when tracking looks fine). Do not ask the driver again; reminders wake you when they answer.
4. plan: driver answers and is on time: close_case (unless other workflows are on the event). Late: when journey is also on this event, leave timing to it; otherwise call journey_disruption and draft its lines with propose_plan.
