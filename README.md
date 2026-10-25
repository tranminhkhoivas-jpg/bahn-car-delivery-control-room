# Bahn Express: Car Delivery Control Room

The Bahn Express "Car Delivery Control Room" pairs an On-the-road operations agent built in n8n with a Next.js control room to manage vehicle deliveries already on the move. When disruptions occur—such as sold-out ferries, damaged vehicles, unwell drivers, or unresponsive contacts—an n8n router coordinates specialized problem agents that inspect facts using code tools and assemble unified, single-plan options per order. Operating strictly on synthetic data with mock bookings, the system enforces a strict human-in-the-loop guarantee where a person must approve every booking, cost, delivery date change, and customer message before execution, while enabling drivers, buyers, and operations staff to coordinate interactively.

For setup, requirements, and instructions on running the agent and control room, see [BAHN/README.md](BAHN/README.md).
