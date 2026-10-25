WORKFLOW: Destination problems. No access, site closed, nobody to receive the car, wrong or changed address, buyer not available.
1. site_facts: read the delivery place (access_note, opening_hours), alerts and messages. Ask the driver once for their ETA or what they see on site.
2. buyer_question: the buyer decides where and when. Plan draft with a buyer draft (customer_message) that explains the problem and asks for a solution, plus {"kind":"buyer_decision","detail":"Record where and when the buyer wants delivery"} and a staff_task if staff must call the site.
3. journey_options: when the buyer's answer arrives (follow-up) and it moves the timing, call journey_disruption and use its draft lines (new window, hotel night).
4. plan: one draft with those lines, a buyer confirmation, a delivery-contact draft when snapshot.delivery_contact is someone else, and a driver note.
