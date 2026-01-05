// =============================================
// Command Palette Context for Maestro UI
// =============================================
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
  useCallback,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { useNotification } from '@/contexts/NotificationContext'
import { maestroApi, PolicyCheckResponse } from '@/lib/maestroApi'

interface CommandPaletteAction {
  id: string
  title: string
  subtitle?: string
  section: string
  action: () => void
  keywords: string[]
}

interface CommandPaletteContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  actions: CommandPaletteAction[]
  registerAction: (action: CommandPaletteAction) => void
  unregisterAction: (id: string) => void
}

const CommandPaletteContext = createContext<
  CommandPaletteContextType | undefined
>(undefined)

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error(
      'useCommandPalette must be used within CommandPaletteProvider'
    )
  }
  return context
}

interface CommandPaletteProviderProps {
  children: ReactNode
}

interface PolicyActionField {
  id: string
  label: string
  placeholder: string
  required?: boolean
  defaultValue?: string
}

interface PolicyActionConfig {
  id: string
  title: string
  subtitle: string
  policyAction: string
  confirmLabel: string
  fields: PolicyActionField[]
  execute: (values: Record<string, string>) => Promise<void>
}

export function CommandPaletteProvider({
  children,
}: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [actions, setActions] = useState<CommandPaletteAction[]>([])
  const navigate = useNavigate()
  const { showNotification } = useNotification()
  const [policyAction, setPolicyAction] = useState<PolicyActionConfig | null>(
    null
  )
  const [policyResult, setPolicyResult] = useState<PolicyCheckResponse | null>(
    null
  )
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [confirmText, setConfirmText] = useState('')
  const [isCheckingPolicy, setIsCheckingPolicy] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetPolicyAction = useCallback(() => {
    setPolicyAction(null)
    setPolicyResult(null)
    setFormValues({})
    setConfirmText('')
    setIsCheckingPolicy(false)
    setIsSubmitting(false)
  }, [])

  const openPolicyAction = useCallback(
    async (action: PolicyActionConfig) => {
      const initialValues = initializeValues(action)
      setPolicyAction(action)
      setFormValues(initialValues)
      setConfirmText('')
      setPolicyResult(null)
      setIsCheckingPolicy(true)
      try {
        const result = await simulatePolicy(action, initialValues)
        setPolicyResult(result)
      } catch (error) {
        setPolicyResult({ allowed: false, reason: 'Policy simulation failed.' })
      } finally {
        setIsCheckingPolicy(false)
      }
    },
    []
  )

  const updateFormValue = useCallback((field: string, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }))
    setPolicyResult(null)
  }, [])

  const submitPolicyAction = useCallback(async () => {
    if (!policyAction) return
    setIsSubmitting(true)
    try {
      const result = await simulatePolicy(policyAction, formValues)
      setPolicyResult(result)
      if (result && !result.allowed) {
        showNotification({
          type: 'warning',
          title: 'Policy denied',
          message: result.reason || 'Policy denied the action.',
        })
        setIsSubmitting(false)
        return
      }
      await policyAction.execute(formValues)
      resetPolicyAction()
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Action failed',
        message: 'Unable to complete the policy action.',
      })
      setIsSubmitting(false)
    }
  }, [formValues, policyAction, resetPolicyAction, showNotification])

  const policyActions = useMemo<PolicyActionConfig[]>(
    () => [
      {
        id: 'run-start',
        title: 'Start run',
        subtitle: 'Launch a new Maestro runbook execution',
        policyAction: 'run/start',
        confirmLabel: 'START',
        fields: [
          {
            id: 'runbook',
            label: 'Runbook',
            placeholder: 'intelgraph-build-pipeline',
            required: true,
            defaultValue: 'intelgraph-build-pipeline',
          },
          {
            id: 'environment',
            label: 'Environment',
            placeholder: 'production',
            defaultValue: 'production',
          },
        ],
        execute: async values => {
          showNotification({
            type: 'success',
            title: 'Run started',
            message: `Runbook ${values.runbook} launched for ${values.environment}.`,
          })
          navigate('/maestro/runs')
        },
      },
      {
        id: 'run-cancel',
        title: 'Cancel run',
        subtitle: 'Stop a live run and capture a receipt',
        policyAction: 'run/cancel',
        confirmLabel: 'CANCEL',
        fields: [
          {
            id: 'runId',
            label: 'Run ID',
            placeholder: 'run_123',
            required: true,
          },
        ],
        execute: async values => {
          showNotification({
            type: 'success',
            title: 'Run cancelled',
            message: `Cancellation request submitted for ${values.runId}.`,
          })
          navigate(`/maestro/runs/${values.runId}`)
        },
      },
      {
        id: 'run-rerun-step',
        title: 'Re-run step',
        subtitle: 'Retry a specific run step',
        policyAction: 'run/step/retry',
        confirmLabel: 'RERUN',
        fields: [
          {
            id: 'runId',
            label: 'Run ID',
            placeholder: 'run_123',
            required: true,
          },
          {
            id: 'stepId',
            label: 'Step ID',
            placeholder: 'step_4',
            required: true,
          },
        ],
        execute: async values => {
          showNotification({
            type: 'success',
            title: 'Step retry queued',
            message: `Retry requested for ${values.runId} • ${values.stepId}.`,
          })
          navigate(`/maestro/runs/${values.runId}`)
        },
      },
      {
        id: 'run-export-evidence',
        title: 'Export evidence',
        subtitle: 'Prepare an evidence bundle with policy guardrails',
        policyAction: 'export/report',
        confirmLabel: 'EXPORT',
        fields: [
          {
            id: 'runId',
            label: 'Run ID',
            placeholder: 'run_123',
            required: true,
          },
          {
            id: 'destination',
            label: 'Destination',
            placeholder: 'secure-evidence-bucket',
            required: true,
          },
        ],
        execute: async values => {
          showNotification({
            type: 'success',
            title: 'Evidence export queued',
            message: `Export started for ${values.runId} to ${values.destination}.`,
          })
        },
      },
    ],
    [navigate, showNotification]
  )

  // Default navigation actions
  useEffect(() => {
    const defaultActions: CommandPaletteAction[] = [
      {
        id: 'nav-overview',
        title: 'Go to Overview',
        section: 'Navigation',
        action: () => navigate('/maestro'),
        keywords: ['overview', 'dashboard', 'home'],
      },
      {
        id: 'nav-runs',
        title: 'Go to Runs',
        section: 'Navigation',
        action: () => navigate('/maestro/runs'),
        keywords: ['runs', 'executions', 'workflow'],
      },
      {
        id: 'nav-runbooks',
        title: 'Go to Runbooks',
        section: 'Navigation',
        action: () => navigate('/maestro/runbooks'),
        keywords: ['runbooks', 'templates', 'pipelines'],
      },
      {
        id: 'nav-budgets',
        title: 'Go to Budgets',
        section: 'Navigation',
        action: () => navigate('/maestro/budgets'),
        keywords: ['budgets', 'cost', 'spend', 'finops'],
      },
      {
        id: 'nav-policies',
        title: 'Go to Policies',
        section: 'Navigation',
        action: () => navigate('/maestro/policies'),
        keywords: ['policies', 'opa', 'compliance', 'security'],
      },
    ]

    const policyCommands: CommandPaletteAction[] = policyActions.map(action => ({
      id: action.id,
      title: action.title,
      subtitle: action.subtitle,
      section: 'Run Actions',
      action: () => openPolicyAction(action),
      keywords: [action.title.toLowerCase(), action.policyAction],
    }))

    setActions(prev => [...prev, ...defaultActions, ...policyCommands])

    return () => {
      setActions(prev =>
        prev.filter(
          action =>
            !defaultActions.find(def => def.id === action.id) &&
            !policyCommands.find(def => def.id === action.id)
        )
      )
    }
  }, [navigate, openPolicyAction, policyActions])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setIsOpen(true)
      }
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const registerAction = (action: CommandPaletteAction) => {
    setActions(prev => [...prev.filter(a => a.id !== action.id), action])
  }

  const unregisterAction = (id: string) => {
    setActions(prev => prev.filter(action => action.id !== id))
  }

  return (
    <CommandPaletteContext.Provider
      value={{
        isOpen,
        setIsOpen,
        actions,
        registerAction,
        unregisterAction,
      }}
    >
      {children}
      <PolicyActionDialog
        action={policyAction}
        policyResult={policyResult}
        isCheckingPolicy={isCheckingPolicy}
        isSubmitting={isSubmitting}
        formValues={formValues}
        confirmText={confirmText}
        onClose={resetPolicyAction}
        onConfirm={submitPolicyAction}
        onFieldChange={updateFormValue}
        onConfirmTextChange={setConfirmText}
      />
      {isOpen && <CommandPalette />}
    </CommandPaletteContext.Provider>
  )
}

function PolicyActionDialog({
  action,
  policyResult,
  isCheckingPolicy,
  isSubmitting,
  formValues,
  confirmText,
  onClose,
  onConfirm,
  onFieldChange,
  onConfirmTextChange,
}: {
  action: PolicyActionConfig | null
  policyResult: PolicyCheckResponse | null
  isCheckingPolicy: boolean
  isSubmitting: boolean
  formValues: Record<string, string>
  confirmText: string
  onClose: () => void
  onConfirm: () => void
  onFieldChange: (field: string, value: string) => void
  onConfirmTextChange: (value: string) => void
}) {
  if (!action) return null

  const requiredFieldsValid = action.fields.every(field =>
    field.required ? Boolean(formValues[field.id]?.trim()) : true
  )
  const confirmValid =
    confirmText.trim().toUpperCase() === action.confirmLabel.toUpperCase()

  return (
    <Dialog open={Boolean(action)} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action.title}</DialogTitle>
          <DialogDescription>{action.subtitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <div className="font-medium text-gray-900">Policy simulation</div>
            {isCheckingPolicy ? (
              <div className="mt-1 text-gray-500">Simulating policy...</div>
            ) : policyResult ? (
              <div className="mt-1">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    policyResult.allowed
                      ? 'text-emerald-700 bg-emerald-50 ring-emerald-600/20'
                      : 'text-red-700 bg-red-50 ring-red-600/20'
                  }`}
                >
                  {policyResult.allowed ? 'Allowed' : 'Denied'}
                </span>
                {policyResult.reason && (
                  <p className="mt-2 text-xs text-gray-600">
                    {policyResult.reason}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-1 text-gray-500">
                Policy simulation pending.
              </div>
            )}
          </div>

          {action.fields.map(field => (
            <div key={field.id}>
              <label className="text-sm font-medium text-gray-700">
                {field.label}
              </label>
              <input
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={formValues[field.id] ?? ''}
                placeholder={field.placeholder}
                onChange={event => onFieldChange(field.id, event.target.value)}
              />
            </div>
          ))}

          <div>
            <label className="text-sm font-medium text-gray-700">
              Type {action.confirmLabel} to confirm
            </label>
            <input
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={confirmText}
              onChange={event => onConfirmTextChange(event.target.value)}
              placeholder={action.confirmLabel}
            />
          </div>
        </div>
        <DialogFooter className="mt-6">
          <button
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            disabled={
              isSubmitting ||
              isCheckingPolicy ||
              !requiredFieldsValid ||
              !confirmValid ||
              policyResult?.allowed === false
            }
            onClick={onConfirm}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm action'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Command Palette Modal Component
function CommandPalette() {
  const { isOpen, setIsOpen, actions } = useCommandPalette()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredActions = actions.filter(
    action =>
      action.title.toLowerCase().includes(search.toLowerCase()) ||
      action.keywords.some(keyword =>
        keyword.toLowerCase().includes(search.toLowerCase())
      )
  )

  const executeAction = (action: CommandPaletteAction) => {
    action.action()
    setIsOpen(false)
    setSearch('')
    setSelectedIndex(0)
  }

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  if (!isOpen) {return null}

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div
        className="fixed inset-0 bg-black bg-opacity-25"
        onClick={() => setIsOpen(false)}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="p-4">
          <input
            type="text"
            placeholder="Type a command or search..."
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(
                  Math.min(selectedIndex + 1, filteredActions.length - 1)
                )
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(Math.max(selectedIndex - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (filteredActions[selectedIndex]) {
                  executeAction(filteredActions[selectedIndex])
                }
              }
            }}
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No commands found
            </div>
          ) : (
            <div>
              {Object.entries(
                filteredActions.reduce(
                  (acc, action) => {
                    acc[action.section] = acc[action.section] || []
                    acc[action.section].push(action)
                    return acc
                  },
                  {} as Record<string, CommandPaletteAction[]>
                )
              ).map(([section, sectionActions]) => (
                <div key={section}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                    {section}
                  </div>
                  {sectionActions.map((action, index) => {
                    const globalIndex = filteredActions.indexOf(action)
                    return (
                      <button
                        key={action.id}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-100 ${
                          globalIndex === selectedIndex
                            ? 'bg-blue-50 text-blue-700'
                            : ''
                        }`}
                        onClick={() => executeAction(action)}
                      >
                        <div className="font-medium">{action.title}</div>
                        {action.subtitle && (
                          <div className="text-sm text-gray-500">
                            {action.subtitle}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

async function simulatePolicy(
  action: PolicyActionConfig,
  values: Record<string, string>
): Promise<PolicyCheckResponse> {
  return maestroApi.policyCheck(action.policyAction, values)
}

function initializeValues(action: PolicyActionConfig) {
  return action.fields.reduce<Record<string, string>>((acc, field) => {
    if (field.defaultValue) {
      acc[field.id] = field.defaultValue
    }
    return acc
  }, {})
}
