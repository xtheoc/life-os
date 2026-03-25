import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { AppProvider } from './context/AppContext'
import AppShell from './components/layout/AppShell'
import Home from './pages/Home'
import School from './pages/School'
import Tasks from './pages/Tasks'
import Finance from './pages/Finance'
import Calendar from './pages/Calendar'
import Workout from './pages/Workout'
import Sleep from './pages/Sleep'
import Settings from './pages/Settings'
import Chores from './pages/Chores'
import WeeklyReview from './pages/WeeklyReview'

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/school" element={<School />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/planner" element={<Calendar />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/chores" element={<Chores />} />
            <Route path="/review" element={<WeeklyReview />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  )
}
