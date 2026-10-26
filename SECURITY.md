# Security policy

## Supported version

Security fixes target the current default branch and latest release.

## Reporting a vulnerability

Do not publish exploit details, private documents, credentials, or proof-of-concept payloads in a public issue.

A private security-reporting route has not yet been published for this repository. Before merging this change, the repository owner should enable GitHub private vulnerability reporting or add a monitored private contact here. Until then, public issues may report only that a private report is needed, without technical details.

Please include affected version, platform/browser, impact, minimal reproduction, and any suggested mitigation in the eventual private report.

## Scope

Relevant issues include unsafe HTML handling, script execution, local-file disclosure, credential exposure, remote text transfer without disclosure, and extension privilege misuse. Availability problems in third-party speech services are generally upstream unless Petal Reader handles them unsafely.
