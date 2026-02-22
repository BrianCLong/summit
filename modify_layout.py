import re

file_path = 'apps/web/src/components/Layout.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Add Import
if "OnboardingTour" not in content:
    content = content.replace("import { GlobalStatusBanner }", "import { OnboardingTour } from '@/components/onboarding/OnboardingTour'\nimport { GlobalStatusBanner }")

# 2. Add Component
if "<OnboardingTour />" not in content:
    content = content.replace("<GlobalSearch />", "<GlobalSearch />\n      <OnboardingTour />")

with open(file_path, 'w') as f:
    f.write(content)
