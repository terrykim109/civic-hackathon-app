import type { WardSelection } from '../../types/ward'
import styles from './WardHoverLabel.module.css'

interface WardHoverLabelProps {
  ward: WardSelection
  x: number
  y: number
}

export function WardHoverLabel({ ward, x, y }: WardHoverLabelProps) {
  return (
    <div className={styles.tooltip} style={{ left: x, top: y }} role="status">
      {ward.name}
      <span className={styles.meta}>Ward {ward.wardId}</span>
    </div>
  )
}
