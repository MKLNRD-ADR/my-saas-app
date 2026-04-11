import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-white dark:bg-black">
      <Sidebar />
      {children}
    </div>
  )
}