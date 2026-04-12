import { Routes, Route } from 'react-router-dom'
import Home     from './pages/Home'
import RouteA   from './pages/RouteA'
import RouteB1  from './pages/RouteB1'
import RouteB2  from './pages/RouteB2'
import RouteB3  from './pages/RouteB3'
import RouteB4  from './pages/RouteB4'
import RouteB5  from './pages/RouteB5'
import RouteC   from './pages/RouteC'

export default function App() {
  return (
    <Routes>
      <Route path="/"      element={<Home />} />
      <Route path="/a"     element={<RouteA />} />
      <Route path="/b/1"   element={<RouteB1 />} />
      <Route path="/b/2"   element={<RouteB2 />} />
      <Route path="/b/3"   element={<RouteB3 />} />
      <Route path="/b/4"   element={<RouteB4 />} />
      <Route path="/b/5"   element={<RouteB5 />} />
      <Route path="/c"     element={<RouteC />} />
    </Routes>
  )
}
