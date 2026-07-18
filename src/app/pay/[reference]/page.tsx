import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Placeholder for the buyer-facing invoice page (Phase 6 wires it to the real
// invoice lookup + Monnify checkout URL / virtual account details).
export default async function PayPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Invoice {reference}</CardTitle>
        <CardDescription>
          This payment page goes live in the next build phase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Invoice details &amp; payment options will appear here
        </div>
      </CardContent>
    </Card>
  );
}
