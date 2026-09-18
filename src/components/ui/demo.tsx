import { ShinyButton } from "@/components/ui/shiny-button";
import { Pattern } from "@/components/ui/v-card-17";

function ShinyButtonDemo() {
  return <ShinyButton>Shiny Button</ShinyButton>;
}

export { ShinyButtonDemo };

export default function Default() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-10 bg-slate-50 dark:bg-slate-900">
      <ShinyButtonDemo />
      <Pattern />
    </div>
  );
}
