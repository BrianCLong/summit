# Infrastructure Policies

This directory contains policies for validating infrastructure registry artifacts and scaffolding definitions before they are allowed to be provisioned.

The primary policy `.github/policies/infra/deny-by-default.rego` implements a deny-by-default posture. Only components matching explicitly allowed naming, tagging, ownership, and environmental rules are permitted.
