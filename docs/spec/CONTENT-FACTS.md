# Content Facts (authoritative, supplied by Andrew)

This file supersedes the placeholders and open questions in SPEC.md sections 11-13. Source: `docs/AndrewLeick_Resume.pdf` plus Andrew's direct answers (2026-11-09). Do not invent anything beyond this file. Anything not listed here stays a `TODO:` placeholder.

## Decisions from Andrew

- **Locations:** do NOT show any location anywhere on the site. This includes Palo Alto, Seattle, Atlanta, and any `location` field. Omit location fields from rendered output. Omit them from the data files too, or leave them optional and unset.
- **GPA:** SHOW it: 3.83/4.0.
- **Phone number:** the resume lists one, but do NOT put it on the site (public scraping risk). Leave out of data.
- **CS131 fork:** do NOT include. Exclude it from projects and from any GitHub sync script output (add an exclude list, with `CS131_release` on it).
- **Custom domain:** wanted, not yet chosen. Treat as pending. Hosting stays GitHub Pages. Backend: support a `CNAME` file in `public/` and make `site.url`/base path configurable so the domain is a one-line change. Add domain-setup steps (buy domain, DNS records for GitHub Pages, set custom domain in repo settings, enable HTTPS) to `docs/CONTENT-GUIDE.md` or a deploy doc. Do not invent a domain name.
- **LinkedIn:** https://www.linkedin.com/in/andrew-leick/
- **GitHub:** https://github.com/Andrew-Leick

## Profile

- Name: Andrew Leick
- Email: aleick@stanford.edu (from resume; to be confirmed by Andrew before launch, flag in the status report)
- Headline/role: Stanford student in Electrical Engineering seeking software development roles. (Headline wording is a draft; use "TODO: confirm headline" if you need exact wording, or write a neutral factual one from the facts below. No superlatives.)
- Target roles/availability: not provided, leave as TODO or omit.
- Headshot: not provided, omit (support optional).
- Resume PDF: `docs/AndrewLeick_Resume.pdf`. Backend should copy it to `public/content/` for the site's download link. Do not move or delete the original in docs/.

## Education

- Stanford University
- Bachelor of Science in Electrical Engineering
- GPA: 3.83/4.0
- Expected graduation: June 2028
- Related coursework: Programming Abstractions; Computer Systems from the Ground Up; Computer Vision: Foundations and Applications; Operating Systems Principles (Fall 26); Mathematical Foundations of Computing; From Languages to Information; Probability for Computer Scientists; Linear Algebra & Multivariable Calculus; Differential Equations

## Skills

- Languages: Java, Python, C/C++, TypeScript, JavaScript, HTML
- Cloud: AWS (Lambda, S3, DynamoDB, Athena, API Gateway, Redshift, QuickSight)
- Tools & Frameworks: Git, Node.js, MCP, NumPy, Visual Studio, IntelliJ

## Experience (most recent first; omit locations)

### Software Development Engineer Intern, Amazon (June 2026 - September 2026)
- Designed and built an end-to-end log correlation platform for on-call engineers, cutting investigation time from 30-60 minutes to under 10 by returning every related log across the team's services from a single search.
- Designed a custom structured logging format, onboarded team services onto it, and built an ingestion pipeline handling 100K+ requests/minute and 200+ TB of logs per month, using two Node.js AWS Lambdas to index raw logs in S3 by business identifier and store structured logs in DynamoDB.
- Developed an API Gateway-triggered query Lambda that resolves related business identifiers from DynamoDB and dynamically builds Amazon Athena queries to return all correlated logs.
- Built a TypeScript search UI based on on-call engineer feedback, integrated with the query backend and supporting fine-grained filtering across common identifiers.
- Built an MCP server exposing the platform's search and filtering tools to AI agents, enabling automated agent-driven investigations.
- Tech: Node.js, TypeScript, AWS Lambda, S3, DynamoDB, API Gateway, Athena, MCP

### Software Development Engineer Intern, Amazon (June 2025 - September 2025)
- Designed and implemented an end-to-end AWS system to centralize contract storage for a distributed team, replacing fragmented local document workflows.
- Developed Node.js AWS Lambdas that extract contract metadata with AI-powered parsing and model it in Amazon Redshift for scalable cross-team querying.
- Built Amazon QuickSight dashboards giving engineers and leadership a real-time view of contract status, ownership, and key metadata.
- Tech: Node.js, AWS Lambda, Redshift, QuickSight

### Software Research Intern, Georgia Tech Research Institute (June 2023 - July 2023)
- 1 of 64 selected from a field of 2,200 applicants.
- Built and programmed robot to autonomously navigate and map unknown environment using Python and Robot Operating System.
- Presented results to audience of 200.
- Tech: Python, ROS

## Extracurricular (render as part of Experience or a small "Leadership" entry, per frontend/spec judgment, using the Experience schema if no better fit)

### Team President & Programming/Electrical Lead, FIRST Robotics (August 2020 - May 2024)
- Led team of 25 students in designing, building, and programming a competition robot.
- Fundraised and managed budget of $20,000+ for parts, travel, and competition expenses.
- Programmed robot control systems and autonomous pathfinding using Java.
- Led CAD design for the team using Fusion360.
- Tech: Java, Fusion360

## Projects

### NFL Play Reconstruction (featured)
- Repo: https://github.com/CarterDessommes/NFL-Play-Reconstruction (owned by a classmate, three contributors; Andrew has about 20 commits).
- Course/context: college football computer-vision project (Stanford Computer Vision coursework; confirm exact course context before claiming it. Do not state it is a course project unless README says so).
- Andrew personally built: (1) the jersey number recognition model, (2) the team classifier, and (3) the offense/defense classifier.
- Results/metrics: not provided. Do NOT invent accuracy numbers. Use `TODO: add results` placeholder or omit the results field.
- Describe his role precisely as the three components above, and credit it as a team project with contributors. Backend/frontend: the spec's `role`/`teamProject` style fields should carry this.
- Tech: Python, computer vision (read the repo README for specifics before listing libraries; only list what the README confirms).

No other projects supplied. Do not add CS131_release. Other repos by Andrew may be added later through the data file.

## Still open (leave as TODO, flag in status reports)

- Custom domain name (pending Andrew's choice)
- Confirm email to show publicly (resume uses aleick@stanford.edu)
- Headline wording, target roles, availability
- NFL project results/metrics and exact course context
- Headshot (optional)
- Analytics (spec says none)
