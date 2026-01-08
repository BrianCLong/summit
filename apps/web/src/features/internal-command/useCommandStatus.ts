import {
  useCommandStatusContext,
  CommandStatusContextValue,
} from './CommandStatusProvider'

export function useCommandStatus(): CommandStatusContextValue {
  return useCommandStatusContext()
}
