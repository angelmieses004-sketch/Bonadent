import { EscenaLogin } from "./escena";

export default function LayoutAuth({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh place-items-center p-3 md:p-5">
      <div className="grid w-full max-w-6xl gap-4 rounded-panel bg-shell p-3 md:p-4 lg:min-h-[640px] lg:grid-cols-[1.05fr_1fr]">
        <EscenaLogin />
        <main className="flex flex-col justify-center px-3 py-8 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
