import Sidebar from '@/components/Sidebar'
import AiAssistant from '@/components/AiAssistant'

export const metadata = {
  title: 'TaskFlow Dashboard',
  description: 'Manage your tasks with TaskFlow',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-white dark:bg-[#212121]">
      <Sidebar />
      {children}
      <AiAssistant />
    </div>
  )
}