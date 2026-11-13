import { TopNav } from './components/layout/TopNav'
import { MapView } from './components/map/MapView'
import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.shell}>
      <MapView />
      <div className={styles.ui}>
        <TopNav />
      </div>
    </div>
  )
}
