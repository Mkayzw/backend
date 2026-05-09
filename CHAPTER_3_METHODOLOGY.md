# CHAPTER 3: METHODOLOGY

## 3.1 Introduction

This chapter explains the methodology used in the design, development, and evaluation of the telemedicine platform. The project was implemented as a full-stack software engineering solution for remote patient monitoring and clinical decision support. The platform consists of a frontend user interface and a backend application programming interface that work together to support symptom reporting, patient monitoring, clinical prioritization, and alert-driven review. The chapter describes the development approach adopted, the methods and techniques applied during implementation, the tools and technologies selected, and the major design considerations that influenced the final system.


## 3.2 Research Methodology or Software Development Process

This project adopted an iterative software development process. The system was developed incrementally, with each cycle focusing on a specific functional area of the platform such as authentication, patient management, symptom reporting, clinician dashboards, risk classification, trend analysis, and alert generation. This approach was selected because it allowed both the user interface and the backend logic to be refined continuously as technical requirements and clinical logic became clearer during development.

The iterative approach was appropriate for this project for several reasons. First, the system contains multiple interconnected modules on both the frontend and backend, and building them in stages reduced the risk of major redesign late in the project. Second, the telemedicine context required the clinical decision logic to remain explainable and testable at each phase. Third, the incremental process made it easier to validate whether each interface component, API endpoint, and service module was functioning correctly before integrating it with the rest of the system.

The development process followed these broad stages:

1. problem analysis and definition of platform requirements,
2. database schema design using Prisma,
3. development of the frontend interface using React and Vite,
4. development of backend API endpoints using FastAPI,
5. implementation of service-layer business logic,
6. integration of rule-based clinical intelligence for risk and trend analysis,
7. implementation of alert generation and persistence logic,
8. integration of frontend API modules with backend routes,
9. and functional verification of outputs against expected system behavior.

This methodology can therefore be described as iterative and modular, with a strong emphasis on explainability, maintainability, usability, and clinical relevance.

## 3.3 Methods and Techniques

Several software engineering methods and techniques were used throughout the project. A layered full-stack architecture was adopted so that presentation logic, request handling, business logic, and database access could be separated clearly. This structure improved maintainability and reduced coupling between system components.

On the frontend, the system uses React components, page modules, shared context providers, and route guards to manage the user interface. Client-side routing was used to direct users to different dashboards depending on role, such as patient, clinician, and administrator. Shared authentication state, notifications, and toast messages were managed through context providers, while reusable interface components such as sidebars, top bars, alerts, indicators, modals, and loading states were used to maintain consistency across screens.

On the backend, the system uses controller functions to handle incoming requests, validate preconditions, and call the appropriate service functions. The service layer implements the main project logic, including symptom report processing, risk classification, trend analysis, and alert generation. Prisma ORM was used as the primary data access mechanism, allowing the application to interact with patients, symptom reports, assignments, and alerts through structured database queries.

A component-based user interface technique was used on the frontend. This made it possible to separate rendering concerns from data-fetching concerns. Pages orchestrate data loading through API modules, while reusable components display alerts, risk badges, trend indicators, charts, loading states, and navigation controls. This technique improved reuse and reduced duplication across role-based dashboards.

A rule-based algorithmic technique was used for the platform's clinical intelligence layer. Instead of training a black-box predictive model, the system applies deterministic rules to structured symptom features. This method was selected because it supports transparency and makes each classification easier to justify in a clinical and academic context. Risk scoring is based on symptom weights, severity levels, duration, frequency, medication adherence, vital signs, chronic condition relevance, and care context. Trend analysis compares the current report's risk score against previous reports and determines whether the patient's condition is improving, stable, or worsening.

An API-integration technique was also used in the frontend design. Dedicated API utility modules were used to communicate with backend endpoints through a centralized client configuration. This reduced repeated networking code and allowed authentication tokens to be attached consistently to protected requests.

Functional verification was also used as an evaluation technique. Since the platform is rule-based, the correctness of the output depends on whether the implemented rules behave as intended. For this reason, the project was evaluated by checking that symptom inputs, risk thresholds, trend calculations, alert conditions, and user interface actions produced the expected outputs.

## 3.3.1 Data Handling and Feature Engineering

This subsection is only partially applicable because the project does not use machine learning training data. However, the system still performs structured data handling and feature transformation across both the frontend and backend. User input is collected through validated forms and API payloads, then transformed into standardized features that can be processed by the rule-based clinical engine.

The main features handled by the system include:

- symptom identifiers,
- severity categories,
- symptom duration in days,
- symptom frequency,
- medication adherence,
- temperature,
- heart rate,
- chronic conditions,
- and care context derived from the active assignment.

These features are not used as raw free-text values. Instead, they are normalized into categories and rule inputs so that the scoring engine can process them consistently. For example, symptoms are stored as structured symptom names, severity is mapped to a predefined severity score, and care context is translated into bonus rules based on the patient's current treatment context.

The frontend also performs practical interface-level data handling. Authentication state is stored locally for session continuity, role information is used to redirect users to the correct dashboard, and dashboard views transform backend responses into human-readable cards, badges, indicators, tables, and charts.

The rationale for this approach was to make the data clinically interpretable, easy to validate, and suitable for deterministic decision-making. This structured handling of input data also reduces ambiguity and improves consistency in risk scoring, trend analysis, and user interface presentation.

## 3.3.2 Model Development and Training

This subsection is not applicable in the traditional machine learning sense because the project does not use a trained predictive model. Instead, the platform implements a rule-based clinical decision engine. The development process therefore focused on designing and refining the scoring logic, thresholds, and alert conditions rather than selecting model architectures or training hyperparameters.

The risk classification component was developed by assigning weights to symptoms and clinical factors according to their relative severity. The trend analysis component was developed by comparing current risk scores with recent historical reports and then applying override rules for high-risk spikes and unstable variation. These rules were refined to support explainability and consistent output behavior.

Although no machine learning training took place, the project still considered important issues that are normally relevant in intelligent systems, such as fairness, consistency, and explainability. The use of explicit scoring rules helps reduce opacity and allows the decision logic to be inspected and defended during clinical review or academic evaluation.

## 3.4 Tools and Technologies

The project was implemented using a set of technologies selected for rapid frontend and backend development, strong data validation, and maintainable system architecture.

**Python**

Python was used as the main backend programming language. It was selected because it supports rapid development, readable service-layer logic, and strong compatibility with web frameworks and ORM tooling.

**FastAPI**

FastAPI was used to build the backend API. It was chosen because it supports asynchronous request handling, automatic API documentation, and structured request validation. These features were useful for implementing a responsive healthcare-oriented backend system.

**Prisma Client for Python**

Prisma was used as the database access layer. It was selected because it provides schema-driven data modeling and simplifies interaction with relational data. This was important for managing linked entities such as patients, clinicians, assignments, symptom reports, and alerts.

**Pydantic**

Pydantic was used for schema validation. It helped ensure that incoming request data was structured correctly before being passed into the business logic layer.

**Uvicorn**

Uvicorn was used as the ASGI server for running the FastAPI application during development and testing.

**python-dotenv**

This library was used for managing environment variables and configuration values.

**python-jose, passlib, and bcrypt**

These libraries were used to support authentication and password security functions in the system.

**React**

React was used to build the frontend user interface. It was selected because it supports component-based development, reusable views, and efficient state-driven rendering, which were useful for building dashboards for patients, clinicians, and administrators.

**Vite**

Vite was used as the frontend build tool and development server. It was chosen because it provides a fast development experience and simple integration with React.

**react-router-dom**

This library was used for client-side routing. It allowed the application to direct users to role-specific routes and protect restricted pages through route-guard logic.

**Context API**

React context providers were used to manage shared application state such as authentication, toast messages, and alert notifications. This reduced the need for excessive prop passing across components.

**Recharts**

Recharts was used to display risk and trend data visually on the frontend dashboards. This made it easier for clinicians to interpret changes in patient condition over time.

**lucide-react**

This icon library was used to improve interface clarity and visual communication across dashboards, alerts, and status displays.

**Swagger UI and ReDoc**

These built-in FastAPI documentation interfaces were useful during development because they allowed API endpoints to be inspected and tested quickly.

Overall, these tools were selected because they supported a modular, asynchronous, and maintainable full-stack architecture appropriate for a telemedicine platform.

## 3.5 Project Requirements and Design Considerations

The project requirements were derived from the needs of a telemedicine monitoring platform. The system needed to allow patients to submit symptom reports through a usable frontend interface, support clinicians in prioritizing patients through dashboard views, and provide a reliable mechanism for identifying high-risk or worsening cases in the backend.

Requirements were identified from the intended use of the platform and then translated into system capabilities. The main functional requirements included:

- role-based user login and access control,
- patient symptom report submission,
- patient and clinician management,
- risk classification,
- trend analysis over time,
- automatic alert generation,
- dashboard visualization of monitoring data,
- and database persistence of clinical events.

The requirements were prioritized according to clinical importance. Features directly linked to patient safety and clinical prioritization were treated as core requirements, while supporting features such as metrics and auxiliary platform services were considered secondary.

Several design considerations influenced the final system design.

**Usability**

The platform was designed to present users with interpretable outputs rather than raw numerical values alone. On the frontend, this was addressed through role-specific dashboards, route protection, reusable interface components, charts, badges, and alerts. On the backend, risk explanations are stored with symptom reports and included in alerts so that clinical staff can understand why a patient was escalated.

**Scalability**

A modular architecture was used so that future features can be added without major restructuring. Separating frontend pages, components, context providers, API modules, routes, controllers, services, and schemas makes the codebase easier to extend.

**Security**

The project includes authentication support on both the frontend and backend. Protected routes, token-based requests, and server-side processing were used so that sensitive clinical data remained under backend control rather than being trusted to the client interface alone.

**Performance**

Asynchronous backend request handling and lightweight rule-based computation were used to keep response times low. On the frontend, a component-based architecture and centralized API access helped keep interface behavior responsive. This was appropriate for a real-time symptom reporting workflow.

**Maintainability**

The use of separated frontend and backend modules, together with service-layer encapsulation and reusable components, makes the system easier to debug, test, and improve over time.

**Explainability**

This was one of the most important design considerations. The clinical decision logic was designed as a deterministic scoring and threshold system so that each decision can be traced back to specific inputs and rules, while the frontend presents those results in a form that clinicians can interpret quickly.

## 3.6 Conclusion

This chapter has described the methodology used to develop the telemedicine platform. The project followed an iterative software development process supported by modular frontend and backend design, API integration, and rule-based clinical logic. The methods and techniques used emphasized structured input handling, explainable decision-making, reusable interface design, and separation of concerns across the system architecture.

The selected tools and technologies provided a practical foundation for implementing the platform, while the design considerations ensured that the system remained usable, clinically useful, maintainable, and scalable. Overall, the methodology was appropriate for building a full-stack software engineering solution focused on remote patient monitoring and clinical decision support.
