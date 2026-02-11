import re

# 1. Fix OnboardingTour.tsx
tour_path = 'apps/web/src/components/onboarding/OnboardingTour.tsx'
with open(tour_path, 'r') as f:
    tour_content = f.read()

# Replace useState and remove useEffect
# Need to be careful with imports if I change lines.

# Old:
#   const [currentStep, setCurrentStep] = useState<number>(-1)
#   const [coords, setCoords] = ...
#   const [isVisible, setIsVisible] = useState(false)
#   useEffect(...)

# New:
#   const [currentStep, setCurrentStep] = useState<number>(() => {
#      if (typeof window !== 'undefined' && !localStorage.getItem('summit-tour-completed')) return 0
#      return -1
#   })
#   const [coords, setCoords] = ...
#   const [isVisible, setIsVisible] = useState(() => {
#      if (typeof window !== 'undefined' && !localStorage.getItem('summit-tour-completed')) return true
#      return false
#   })

# Remove useEffect block
tour_content = re.sub(r"  useEffect\(\(\) => \{[^}]*?localStorage[^}]*?\}, \[\]\)\n", "", tour_content, flags=re.DOTALL)

# Replace useState initializers
tour_content = tour_content.replace("useState<number>(-1)", "useState<number>(() => (typeof window !== 'undefined' && !localStorage.getItem('summit-tour-completed')) ? 0 : -1)")
tour_content = tour_content.replace("useState(false)", "useState(() => (typeof window !== 'undefined' && !localStorage.getItem('summit-tour-completed')) ? true : false)")

with open(tour_path, 'w') as f:
    f.write(tour_content)

# 2. Fix SVGGraphRenderer.tsx
svg_path = 'apps/web/src/graphs/SVGGraphRenderer.tsx'
with open(svg_path, 'r') as f:
    svg_content = f.read()

# Replace: node.on('mouseenter', function (this: SVGGElement, event, d) {
# With:    node.on('mouseenter', (event, d) => {
# And:     select(this) -> select(event.currentTarget as SVGGElement)

svg_content = svg_content.replace("node.on('mouseenter', function (this: SVGGElement, event, d) {", "node.on('mouseenter', (event, d) => {")
svg_content = svg_content.replace("select(this)", "select(event.currentTarget as SVGGElement)")

# Also mouseleave
svg_content = svg_content.replace("node.on('mouseleave', function (this: SVGGElement, event, d) {", "node.on('mouseleave', (event, d) => {")
# select(this) replacement works for both if specific enough.
# But wait, `select(this)` might match both.
# I already replaced one above.
# I should run replacement globally for select(this) inside the file?
# No, `select(this)` might be used elsewhere.
# But in this file, it's only in these d3 handlers.

with open(svg_path, 'w') as f:
    f.write(svg_content)
