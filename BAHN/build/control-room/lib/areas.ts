// Area agents the control room can wake up. Every area agent shares one contract: it writes cases, timeline,
// proposals and plan steps to the same n8n Data Tables, and people decide through the shared act and step
// webhooks. Adding an area = build its n8n workflow on that contract, then add one entry here.

export type SampleEvent = { label: string; orderRef: string; event: string }

export type Area = {
  id: string
  label: string
  /** n8n webhook path that takes { order_ref, source, event }. */
  webhook: string
  /** Board lanes this area watches; flagged orders there are offered to its agent. */
  lanes: string[]
  samples: SampleEvent[]
}

export const AREAS: Area[] = [
  {
    id: "on_the_road",
    label: "On the road",
    webhook: "/webhook/bahn/on-the-road",
    lanes: ["booked", "moving"],
    // One per problem workflow; the router picks the workflow from the codes and the text, not from the sample.
    samples: [
      { label: "Vehicle warning", orderRef: "CD-420322", event: "VEHICLE_WARNING and SAFETY_STOP: the driver stopped with a warning light and recovery waits on the customer. TRACKING_GAP is also open." },
      { label: "Ferry sold out", orderRef: "CD-420299", event: "FERRY_SOLD_OUT alert: the planned overnight crossing is sold out. Find the best rebooking." },
      { label: "Ferry at risk", orderRef: "CD-420603", event: "FERRY_CONNECTION_RISK alert: the car may miss check-in for today's crossing. Check the timing and rebook if needed." },
      { label: "Delivery access", orderRef: "CD-420437", event: "DELIVERY_ACCESS_RISK alert: nobody may be at the delivery site to receive the car in the promised window." },
      { label: "Tracking gap", orderRef: "CD-420806", event: "TRACKING_GAP alert: no position from the driver app since 02:12. Check where the car is." },
      { label: "Driver unwell", orderRef: "CD-420537", event: "Driver message: I feel unwell and cannot continue driving today." },
      { label: "Release document", orderRef: "CD-420458", event: "RELEASE_DOCUMENT_UNCLEAR alert: the pickup site questions the release note for this car." },
      { label: "Fuel receipt", orderRef: "CD-420710", event: "The driver submitted a fuel receipt of DKK 315 and asks to be reimbursed." },
    ],
  },
]

/** What each proposal action means, in words. Unknown actions show their code. */
export const ACTION_LABELS: Record<string, string> = {
  plan: "Plan",
  rebooking_plan: "Rebooking plan",
  customer_message: "Customer message",
  change_delivery_promise: "Change delivery promise",
  book_recovery: "Book recovery",
  book_travel: "Book travel",
  approve_cost: "Approve cost",
  change_booking: "Change booking",
  reassign_driver: "Reassign driver",
  other: "Other",
}

export const STEP_LABELS: Record<string, string> = {
  book_ferry: "Book ferry",
  book_hotel: "Book hotel",
  book_train: "Book train",
  book_flight: "Book flight",
  book_recovery: "Book recovery",
  approve_cost: "Approve cost",
  change_delivery_window: "New delivery window",
  reassign_driver: "Hand over to new driver",
  notify_driver: "Tell the driver",
  customer_message: "Send customer message",
  delivery_contact_message: "Message delivery contact",
  buyer_decision: "Buyer's answer",
  staff_task: "Staff task",
}

/** Router workflow ids (n8n route lines) in words. */
export const WORKFLOW_LABELS: Record<string, string> = {
  vehicle: "Vehicle", journey: "Journey", destination: "Destination", tracking: "Tracking",
  incident: "Incident", documents: "Documents", expenses: "Expenses", general: "General",
}
