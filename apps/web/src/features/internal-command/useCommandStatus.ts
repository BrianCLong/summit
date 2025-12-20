import { useCommandStatusContext } from './CommandStatusProvider'

export function useCommandStatus() {
  return useCommandStatusContext()
}
