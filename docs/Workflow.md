feat(service-request): define complete service lifecycle

Workflow:
- Customer creates a service request
- Status initialized as CREATED
- Manager assigns an employee
- Employee updates status through:
  CREATED
  → RECEIVED
  → INSPECTION
  → IN_PROGRESS
  → QUALITY_CHECK
  → READY_FOR_PICKUP
  → CLOSED

This establishes the core business workflow for the AutoCare Service Center Management System.
