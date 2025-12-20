import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store'

export function InvisibleHandLayer() {
  const { invisibleHandMode } = useSelector((state: RootState) => state.ui)

  useEffect(() => {
    if (invisibleHandMode) {
      document.body.classList.add('invisible-hand-mode')
    } else {
      document.body.classList.remove('invisible-hand-mode')
    }
  }, [invisibleHandMode])

  return null
}
