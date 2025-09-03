# Principles & Use Case Guidelines

## Principle 1: Telling Stories
- Stories describe what a system should do, the goals, and how to handle problems.  
- Stories are captured as part of the use case narrative.  
- Capture actionable and testable stories.  
- Test cases demonstrate that the system meets the requirements.  
- **"Done"** criteria is satisfied when stories can be validated through tests.  

---

## Principle 2: Big Picture
- Understanding the big picture is important as the system changes and grows.  
- Helps decide:  
  - What to include  
  - What to leave out  
  - What it will cost  
  - What benefit it will provide  
  - What is the scope  
  - What is the progress  
- Use case diagrams are useful for modeling the big picture.  

---

## Principle 3: Value
- **"Value is only generated if the system is actually used."**  
- Clarifies how and why the system will be used.  
- Use cases focus on achieving goals for a user.  
- Includes:  
  - Successful or happy paths  
  - Problem or alternative paths  
- Use case narratives include:  
  - Basic flow (steps capturing interaction between user and system)  
  - Alternative flows (other ways of using the system or problem paths)  

---

## Principle 4–6: Implementing
- **Principle 4: Slices** → Slice a use case into smaller stories; implement story by story.  
- **Principle 5: Incremental Delivery** → Deliver value in increments by adding additional slices.  
- **Principle 6: Adapt to Team** → Scale up or down to match team needs.  

---

## Actors
- Actors are **NOT** part of the system.  
- They represent anyone or anything that must interact with the system.  
- They may:  
  - Only input information to the system  
  - Only receive information from the system  
  - Both input to and receive information from the system  

---

## Use Case Narrative
- A use case = a sequence of transactions performed by a system.  
- Must yield a measurable result of value for a particular actor/user.  
- Represents a major piece of functionality, complete from beginning to end.  
- A use case must deliver something of value to an actor.  
- Use cases that an actor “wants” typically begin with verbs.  

---

## Template for Flow of Events
**UCX Use Case Name**  

1. **Preconditions** → What must happen (in another use case) before this one can start?  
2. **Main Flow** → Describes the different scenarios of the use case as steps.  
3. **Subflows / Extensions** → Breaks “normal” flow into smaller pieces.  
4. **Alternative / Error Flows** → Events that occur outside of the “normal” flow.  

---

## Example Story: Driving

**Use Case:** Clear Intersection  

### Preconditions
- The traffic light has been initialized.  

### Main Flow
1. The driver approaches the intersection.  
2. The driver checks the status **[Check Status]**.  
3. The driver clears the intersection **[Go]**.  

### Subflows
- **[Check Status]** → Driver checks the light **[Check Light]** and the queue **[Check Queue]**.  
  - If light = green **AND** queue = empty → Driver clears intersection **[Go]**.  
  - Otherwise → Driver joins the queue **[Join Queue]**.  

- **[Check Light]** → Check if the light is red, yellow, or green.  
- **[Check Queue]** → Check if the queue is empty or not.  
- **[Go]** → Driver clears the intersection and the use case ends.  
- **[Join Queue]** → Driver joins the end of the queue and re-checks status every 15 seconds **[Check Status]**.  

### Alternative Flows
- **[Light Out]** → Light is not working. Wait until intersection is clear, then drive through.  
- **[Accident]** → Accident blocks the intersection. Slowly drive around it.  
- **[Ice Storm]** → Unsafe driving conditions. Abandon the car and walk.  
