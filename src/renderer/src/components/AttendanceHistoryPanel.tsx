import type { AttendanceEventType, AttendanceLog } from '../../../shared/attendance'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Loader2 } from 'lucide-react'

interface AttendanceHistoryPanelProps {
    logs: AttendanceLog[]
    isLoading: boolean
}

export function AttendanceHistoryPanel({ logs, isLoading }: AttendanceHistoryPanelProps) {
    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader>
                    <CardTitle>Attendance History</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Note</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                                No attendance logs found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                                <TableCell className="font-medium">
                                                    {formatEventType(log.eventType)}
                                                </TableCell>
                                                <TableCell>{log.note || '-'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function formatEventType(eventType: AttendanceEventType): string {
    switch (eventType) {
        case 'clock_out':
            return '退勤'
        case 'break_start':
            return '休憩開始'
        case 'break_end':
            return '休憩終了'
        case 'clock_in':
        default:
            return '打刻'
    }
}
