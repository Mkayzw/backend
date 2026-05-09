# CHAPTER 6: DISCUSSION

## 6.1 Introduction

This chapter discusses and interprets the results presented in Chapter 5. It explains what the findings mean in relation to the project aim, compares the system with the literature reviewed earlier, and reflects on the strengths and weaknesses of the developed prototype. It also considers the practical value of the system and the limits of the current implementation.

Since this project is a software engineering prototype, the discussion focuses on system behavior, design choices, evaluation evidence, and lessons learned from implementation rather than on statistical hypothesis testing.

## 6.2 Summary of Findings

The main findings from the project are that the developed prototype was able to:

- support secure role-based access for patients, clinicians, and administrators,
- allow patients to submit structured symptom reports through a web interface,
- classify submitted reports into LOW, MEDIUM, and HIGH risk levels,
- detect patient trends as IMPROVING, STABLE, or WORSENING,
- generate alerts automatically for high-risk or worsening cases,
- and present the results in dashboard form for clinical review and system monitoring.

These findings show that the project met its main goal of building a secure web-based telemedicine follow-up and remote symptom monitoring platform.

## 6.3 Model Evaluation and Analysis

This subsection is only partly applicable because the project does not use a machine learning model. Instead, it uses a rule-based decision engine. The evaluation therefore focused on whether the rules behaved correctly in realistic scenarios rather than on training accuracy or loss values.

The implemented testing strategy shows that the platform considered different clinical situations such as worsening respiratory symptoms, post-surgical recovery, chronic stable conditions, and medication non-adherence. This is useful because it checks whether the rules are sensible across different patient cases.

The system's alert behavior is especially important. A good remote monitoring system should not miss serious cases, but it should also avoid too many unnecessary alerts. In this project, the rules were designed to identify dangerous symptoms quickly while also using trend analysis to detect deterioration over time. This improves the quality of monitoring compared to a system that only stores reports without interpretation.

## 6.4 Comparison with Existing Literature

The findings from this project are consistent with the literature reviewed in the earlier chapters and in the project presentation. Many existing telemedicine and remote symptom monitoring studies show that digital symptom reporting, clinician dashboards, and alert systems can support early intervention and improve follow-up care.

This project aligns with those studies in several ways:

- it uses patient-reported symptom data,
- it provides a clinician review dashboard,
- it supports rule-based alert generation,
- and it focuses on follow-up and monitoring rather than in-person-only care.

At the same time, this project differs from some of the literature because it aims to remain lightweight and web-based rather than relying heavily on specialized hardware devices. This is important because one of the identified problems in the background was that some telemonitoring systems are expensive, hardware-dependent, or difficult to fit into everyday workflow.

Therefore, the project contributes by showing that a simpler web-based system can still provide useful monitoring functions such as symptom submission, risk classification, trend tracking, and alerts.

## 6.5 Theoretical Implications

From a software engineering point of view, the project supports the idea that explainable rule-based logic can still play an important role in health monitoring systems. Not every intelligent healthcare system needs a machine learning model. In contexts where transparency is important, rule-based systems may be easier to understand, justify, and maintain.

The project also supports the importance of layered system design. Separating frontend views, backend controllers, services, and database logic made it easier to organise the application and connect different parts of the system without excessive coupling.

Another theoretical implication is that time-based monitoring adds value to clinical decision support. A single symptom report can show current status, but trend analysis gives a broader view of whether the patient is getting better or worse. This makes the system more useful than a simple reporting form.

## 6.6 Practical Implications

In practice, the developed platform could help with remote follow-up care by reducing the need for every patient to visit a health facility for basic review. Patients can submit reports remotely, while clinicians can focus attention on patients who are most likely to need action.

The practical value of the system includes:

- faster identification of urgent or worsening cases,
- better visibility of patient history and trends,
- improved organization of follow-up work through dashboards,
- and a structured way to manage alerts and assignments.

For low-resource or smaller-scale deployments, the fact that the platform is web-based and does not depend on special monitoring devices is also a practical advantage.

## 6.7 Validation and Reliability

The project included several mechanisms that support validity and reliability. First, the clinical logic is deterministic, which means the same input should produce the same result each time. This makes the system easier to test and verify. Second, the testing strategy included patient scenarios, workflow testing, edge cases, and role-based access control checks. Third, the platform includes metrics logging for response time, errors, and classification summaries.

These features improve confidence in the prototype because they show that evaluation was considered during development. However, reliability at large real-world scale would still need stronger testing in a production-like environment.

## 6.8 Limitations and Methodological Reflections

Although the project achieved its main objectives, there are important limitations.

First, the system is a prototype and not a fully deployed clinical product. This means the project demonstrates functionality, but not full real-world clinical adoption. Second, the discussion of usability and performance is based mainly on the implemented system features and testing support rather than on a large formal user study with many participants. Third, the rule-based logic is explainable, but it may need further clinical review and refinement before being used in a real healthcare environment.

There are also technical limitations:

- the current platform depends on manually entered symptom data,
- the quality of outputs depends on the quality of patient input,
- the trend engine uses recent reports only and does not model long-term complexity,
- and the alert logic may still need tuning to reduce possible false positives or false negatives in wider use.

A methodological reflection from this project is that choosing a rule-based approach was a good decision for this stage of development. It made the system easier to explain, easier to test, and easier to present academically. However, if the project grows in the future, more advanced clinical validation or intelligent prediction methods could be explored.

## 6.9 Conclusion

This chapter discussed the meaning and importance of the results produced by the telemedicine platform. The findings show that the project successfully delivered a working remote symptom monitoring prototype with role-based access, rule-based intelligence, alerting, and dashboard support. The system is consistent with the wider telemedicine literature and addresses the practical need for a lightweight follow-up platform.

At the same time, the chapter has shown that the current work is still a prototype with clear limitations. Even so, the project provides a strong starting point for future improvement, wider evaluation, and possible deployment in more realistic healthcare settings.

