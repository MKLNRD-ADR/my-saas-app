import Sidebar from '@/components/Sidebar'
import AiAssistant from '@/components/AiAssistant'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-white dark:bg-[#212121]">
      <Sidebar />
      {children}
      <AiAssistant />
    </div>
  )
}