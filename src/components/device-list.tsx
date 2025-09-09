import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { cn } from "@/lib/utils";

const devices: { name: string, platform: string, status: 'online' | 'offline', id: number }[] = [];

export function DeviceList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Active Peers</CardTitle>
        <CardDescription>Devices available for transfer.</CardDescription>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No active peers.
          </div>
        ) : (
          <ul className="space-y-4">
            {devices.map((device) => (
              <li key={device.name} className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={`https://picsum.photos/40/40?grayscale&random=${device.id}`} width={40} height={40} data-ai-hint="person avatar"/>
                  <AvatarFallback>{device.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{device.name}</p>
                  <p className="text-xs text-muted-foreground">{device.platform}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    device.status === 'online' ? 'bg-primary' : 'bg-muted-foreground'
                  )}></span>
                  <span className="text-sm text-muted-foreground capitalize">{device.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
