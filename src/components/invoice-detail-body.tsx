import { InvoiceShare } from '@/components/invoice-share';
import { SimulatePayment } from '@/components/simulate-payment';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  customerLabel,
  formatDate,
  formatDateTime,
  formatNaira,
  INVOICE_STATUS_STYLES,
  socialHandleLabel,
} from '@/lib/format';
import type { Invoice, Payment } from '@/lib/schemas';
import { cn } from '@/lib/utils';

// The invoice detail presentation (summary card + payment card), shared by the
// full /invoices/[id] page and the invoice side-sheet so both stay identical.
export function InvoiceDetailBody({
  invoice,
  payment,
}: {
  invoice: Invoice;
  payment: Payment | null;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{formatNaira(invoice.amount)}</CardTitle>
              <CardDescription>
                {customerLabel(invoice)}
                {invoice.item ? ` · ${invoice.item}` : ''}
              </CardDescription>
            </div>
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                INVOICE_STATUS_STYLES[invoice.status],
              )}
            >
              {invoice.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Item</dt>
              <dd>{invoice.item ?? 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Buyer</dt>
              <dd>{customerLabel(invoice)}</dd>
            </div>
            {/* When a name is the primary label, the handle+platform would be
                hidden - give it its own row so it is never lost. */}
            {invoice.customer_name && invoice.customer_social_handle && (
              <div>
                <dt className="text-xs text-muted-foreground">Social</dt>
                <dd>
                  {socialHandleLabel(
                    invoice.customer_social_handle,
                    invoice.customer_social_platform,
                  )}
                </dd>
              </div>
            )}
            {invoice.category_name && (
              <div>
                <dt className="text-xs text-muted-foreground">Category</dt>
                <dd className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: invoice.category_color ?? undefined }}
                  />
                  {invoice.category_name}
                </dd>
              </div>
            )}
            {invoice.stream_name && (
              <div>
                <dt className="text-xs text-muted-foreground">Stream</dt>
                <dd>{invoice.stream_name}</dd>
              </div>
            )}
            {invoice.notes && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Notes</dt>
                <dd>{invoice.notes}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd>{formatDateTime(invoice.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Due</dt>
              <dd>{invoice.due_date ? formatDate(invoice.due_date) : 'None'}</dd>
            </div>
          </dl>
          {invoice.status === 'pending' && (
            <>
              <InvoiceShare invoice={invoice} />
              <SimulatePayment invoiceId={invoice.id} />
            </>
          )}
        </CardContent>
      </Card>

      {payment && (
        <Card className="border-brand/30">
          <CardHeader>
            <CardTitle>Payment received</CardTitle>
            <CardDescription>
              Confirmed by Monnify
              {payment.paid_at ? ` on ${formatDateTime(payment.paid_at)}` : ''}
              {payment.payment_method
                ? ` via ${payment.payment_method.toLowerCase().replace(/_/g, ' ')}`
                : ''}
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Paid</dt>
                <dd className="font-medium">{formatNaira(payment.amount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">You receive</dt>
                <dd className="font-medium text-brand">
                  {payment.settlement_amount
                    ? formatNaira(payment.settlement_amount)
                    : 'Pending'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sprout commission</dt>
                <dd className="font-medium">
                  {payment.commission_amount
                    ? formatNaira(payment.commission_amount)
                    : 'Pending'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </>
  );
}
