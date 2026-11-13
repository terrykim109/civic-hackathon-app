import { useState } from 'react'
import { TopNav } from './components/layout/TopNav'
import { MapView } from './components/map/MapView'
import { NEIGHBOURHOOD_LABEL } from './data/mapLocation'
import styles from './App.module.css'

export default function App() {
  const [locationLabel, setLocationLabel] = useState(NEIGHBOURHOOD_LABEL)

  return (
    <div className={styles.shell}>
      <MapView onPlaceLabelChange={setLocationLabel} />
      <div className={styles.ui}>
        <TopNav locationLabel={locationLabel} />
      </div>
    </div>
  )
}
