import { Boxes } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/40">
      <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-8 md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-600">
            <Boxes className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm text-muted-foreground">
            SchemaDrome — Schema-Driven Stateful API Sandbox
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>MIT License</span>
          <span>·</span>
          <span>Built with Next.js 14</span>
        </div>
      </div>
    </footer>
  );
}
