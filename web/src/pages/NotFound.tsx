import Button from "../components/ui/Button";
import PlanetLite from "../components/space/PlanetLite";

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-16 text-center">
      <div>
        <PlanetLite className="mx-auto w-40 opacity-80" />
        <p className="eyebrow mt-6">Signal lost · 404</p>
        <h1 className="mt-3 text-4xl font-semibold">This page drifted out of orbit.</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">The address you followed doesn't point to anything in ExoVet.</p>
        <div className="mt-8">
          <Button to="/">Return to base</Button>
        </div>
      </div>
    </div>
  );
}
