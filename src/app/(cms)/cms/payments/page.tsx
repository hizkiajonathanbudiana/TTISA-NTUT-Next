"use client";

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Pagination } from '@/components/Pagination';
import { useCmsCollection } from '@/hooks/useCmsCollection';
import type { CmsPaymentInstruction, CmsProofContact } from '@/types/content';

const instructionSchema = z.object({
  methodName: z.string().min(3, 'Method name is required'),
  instructionsEn: z.string().min(10, 'English instructions are required'),
  instructionsZhHant: z.string().min(5, 'Chinese instructions are required'),
  displayOrder: z.coerce.number().int().nonnegative().default(99),
  isActive: z.boolean().default(true),
});

const contactSchema = z.object({
  platform: z.enum(['line', 'instagram', 'email']),
  contactInfo: z.string().min(3, 'Contact info is required'),
  displayOrder: z.coerce.number().int().nonnegative().default(99),
  isActive: z.boolean().default(true),
});

type InstructionFormInput = z.input<typeof instructionSchema>;
type InstructionFormValues = z.output<typeof instructionSchema>;
type ContactFormInput = z.input<typeof contactSchema>;
type ContactFormValues = z.output<typeof contactSchema>;

type InstructionModalProps = {
  initialValue?: CmsPaymentInstruction | null;
  onClose: () => void;
  onSubmit: (values: InstructionFormValues) => Promise<void>;
};

type ContactModalProps = {
  initialValue?: CmsProofContact | null;
  onClose: () => void;
  onSubmit: (values: ContactFormValues) => Promise<void>;
};

const ModalShell = ({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-text-primary">{title}</h3>
        <button type="button" onClick={onClose} className="text-text-secondary transition hover:text-text-primary">
          ✕
        </button>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  </div>
);

const InstructionModal = ({ initialValue, onClose, onSubmit }: InstructionModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InstructionFormInput, unknown, InstructionFormValues>({
    resolver: zodResolver(instructionSchema),
    defaultValues: initialValue ?? {
      methodName: '',
      instructionsEn: '',
      instructionsZhHant: '',
      displayOrder: 99,
      isActive: true,
    },
  });

  return (
    <ModalShell title={initialValue ? 'Edit Payment Method' : 'Add Payment Method'} onClose={onClose}>
      <form
        onSubmit={handleSubmit(async (values) => {
          await onSubmit(values);
        })}
        className="space-y-4"
      >
        <div>
          <label className="text-sm font-semibold text-text-secondary">Internal Name</label>
          <input
            {...register('methodName')}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-inner"
            placeholder="e.g., Bank Transfer"
          />
          {errors.methodName && <p className="mt-1 text-sm text-system-danger">{errors.methodName.message}</p>}
        </div>
        <div>
          <label className="text-sm font-semibold text-text-secondary">Instructions (English)</label>
          <textarea
            {...register('instructionsEn')}
            rows={4}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-inner"
            placeholder="Bank: ..."
          />
          {errors.instructionsEn && <p className="mt-1 text-sm text-system-danger">{errors.instructionsEn.message}</p>}
        </div>
        <div>
          <label className="text-sm font-semibold text-text-secondary">Instructions (Traditional Chinese)</label>
          <textarea
            {...register('instructionsZhHant')}
            rows={4}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-inner"
            placeholder="銀行：..."
          />
          {errors.instructionsZhHant && <p className="mt-1 text-sm text-system-danger">{errors.instructionsZhHant.message}</p>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-text-secondary">Display Order</label>
            <input
              type="number"
              {...register('displayOrder', { valueAsNumber: true })}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-inner"
            />
            {errors.displayOrder && <p className="mt-1 text-sm text-system-danger">{errors.displayOrder.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4 rounded border-border" />
            Active
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : initialValue ? 'Save Changes' : 'Create Method'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const ContactModal = ({ initialValue, onClose, onSubmit }: ContactModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormInput, unknown, ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: initialValue ?? {
      platform: 'line',
      contactInfo: '',
      displayOrder: 99,
      isActive: true,
    },
  });

  return (
    <ModalShell title={initialValue ? 'Edit Proof Contact' : 'Add Proof Contact'} onClose={onClose}>
      <form
        onSubmit={handleSubmit(async (values) => {
          await onSubmit(values);
        })}
        className="space-y-4"
      >
        <div>
          <label className="text-sm font-semibold text-text-secondary">Platform</label>
          <select
            {...register('platform')}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-inner"
          >
            <option value="line">LINE</option>
            <option value="instagram">Instagram</option>
            <option value="email">Email</option>
          </select>
          {errors.platform && <p className="mt-1 text-sm text-system-danger">{errors.platform.message}</p>}
        </div>
        <div>
          <label className="text-sm font-semibold text-text-secondary">Contact</label>
          <input
            {...register('contactInfo')}
            className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-inner"
            placeholder="@ttisa_ntut or finance@ttisa.org"
          />
          {errors.contactInfo && <p className="mt-1 text-sm text-system-danger">{errors.contactInfo.message}</p>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-text-secondary">Display Order</label>
            <input
              type="number"
              {...register('displayOrder', { valueAsNumber: true })}
              className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm shadow-inner"
            />
            {errors.displayOrder && <p className="mt-1 text-sm text-system-danger">{errors.displayOrder.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4 rounded border-border" />
            Active
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : initialValue ? 'Save Changes' : 'Create Contact'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const PAGE_SIZE = 10;

const Badge = ({ active }: { active: boolean }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
      active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-200 text-neutral-600'
    }`}
  >
    {active ? 'Active' : 'Hidden'}
  </span>
);

const SectionHeader = ({ title, onAdd }: { title: string; onAdd: () => void }) => (
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
      <p className="text-sm text-text-secondary">Matches the Supabase CMS layout and behavior.</p>
    </div>
    <button
      type="button"
      onClick={onAdd}
      className="rounded-full bg-secondary px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-secondary/30 transition hover:-translate-y-0.5"
    >
      Add
    </button>
  </div>
);

const SearchBar = ({
  value,
  placeholder,
  onChange,
  onReset,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onReset: () => void;
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="flex-1 rounded-2xl border border-border bg-white/70 px-4 py-2 text-sm shadow-inner"
    />
    {value && (
      <button
        type="button"
        onClick={onReset}
        className="text-sm font-semibold text-text-secondary transition hover:text-text-primary"
      >
        Clear
      </button>
    )}
  </div>
);

export default function PaymentsPage() {
  const paymentCollection = useCmsCollection<CmsPaymentInstruction>('payments');
  const contactCollection = useCmsCollection<CmsProofContact>('paymentContacts');

  const [instructionSearch, setInstructionSearch] = useState('');
  const [instructionPage, setInstructionPage] = useState(1);
  const [contactSearch, setContactSearch] = useState('');
  const [contactPage, setContactPage] = useState(1);
  const [editingInstruction, setEditingInstruction] = useState<CmsPaymentInstruction | null>(null);
  const [editingContact, setEditingContact] = useState<CmsProofContact | null>(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const filteredInstructions = useMemo(() => {
    const search = instructionSearch.toLowerCase().trim();
    const sorted = [...paymentCollection.items].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
    if (!search) {
      return sorted;
    }
    return sorted.filter((item) =>
      [item.methodName, item.instructionsEn, item.instructionsZhHant]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(search)),
    );
  }, [instructionSearch, paymentCollection.items]);

  const filteredContacts = useMemo(() => {
    const search = contactSearch.toLowerCase().trim();
    const sorted = [...contactCollection.items].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
    if (!search) {
      return sorted;
    }
    return sorted.filter((item) =>
      [item.platform, item.contactInfo]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(search)),
    );
  }, [contactSearch, contactCollection.items]);

  const instructionTotalPages = Math.max(1, Math.ceil(filteredInstructions.length / PAGE_SIZE));
  const contactTotalPages = Math.max(1, Math.ceil(filteredContacts.length / PAGE_SIZE));

  const paginatedInstructions = filteredInstructions.slice((instructionPage - 1) * PAGE_SIZE, instructionPage * PAGE_SIZE);
  const paginatedContacts = filteredContacts.slice((contactPage - 1) * PAGE_SIZE, contactPage * PAGE_SIZE);

  const saveInstruction = async (values: InstructionFormValues) => {
    try {
      if (editingInstruction) {
        await paymentCollection.updateItem(editingInstruction.id, values);
        toast.success('Payment method updated');
      } else {
        await paymentCollection.createItem(values);
        toast.success('Payment method created');
      }
      setEditingInstruction(null);
      setShowInstructionModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save method');
    }
  };

  const saveContact = async (values: ContactFormValues) => {
    try {
      if (editingContact) {
        await contactCollection.updateItem(editingContact.id, values);
        toast.success('Contact updated');
      } else {
        await contactCollection.createItem(values);
        toast.success('Contact created');
      }
      setEditingContact(null);
      setShowContactModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save contact');
    }
  };

  const deleteInstruction = async (id: string) => {
    if (!window.confirm('Delete this payment method?')) return;
    try {
      await paymentCollection.deleteItem(id);
      toast.success('Payment method removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const deleteContact = async (id: string) => {
    if (!window.confirm('Delete this proof contact?')) return;
    try {
      await contactCollection.deleteItem(id);
      toast.success('Proof contact removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  return (
    <div className="space-y-12">
      <section className="rounded-3xl border border-border bg-white/80 p-8 shadow-card">
        <SectionHeader
          title="Payment Methods"
          onAdd={() => {
            setEditingInstruction(null);
            setShowInstructionModal(true);
          }}
        />
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
          <SearchBar
            value={instructionSearch}
            placeholder="Search payment methods or instructions…"
            onChange={(value) => {
              setInstructionSearch(value);
              setInstructionPage(1);
            }}
            onReset={() => {
              setInstructionSearch('');
              setInstructionPage(1);
            }}
          />
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentCollection.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                    Loading payment methods…
                  </td>
                </tr>
              ) : paginatedInstructions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">
                    No payment methods found.
                  </td>
                </tr>
              ) : (
                paginatedInstructions.map((item) => (
                  <tr key={item.id} className="border-t border-border/70">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-text-primary">{item.methodName}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{item.instructionsEn}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge active={item.isActive !== false} />
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-text-secondary">{item.displayOrder ?? '—'}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInstruction(item);
                            setShowInstructionModal(true);
                          }}
                          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-secondary transition hover:bg-neutral-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteInstruction(item.id)}
                          className="rounded-full bg-system-danger px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={instructionPage}
          totalPages={instructionTotalPages}
          onPageChange={(page) => setInstructionPage(page)}
        />
      </section>

      <section className="rounded-3xl border border-border bg-white/80 p-8 shadow-card">
        <SectionHeader
          title="Proof of Payment Contacts"
          onAdd={() => {
            setEditingContact(null);
            setShowContactModal(true);
          }}
        />
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
          <SearchBar
            value={contactSearch}
            placeholder="Search contacts…"
            onChange={(value) => {
              setContactSearch(value);
              setContactPage(1);
            }}
            onReset={() => {
              setContactSearch('');
              setContactPage(1);
            }}
          />
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contactCollection.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                    Loading contacts…
                  </td>
                </tr>
              ) : paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                    No proof contacts found.
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((item) => (
                  <tr key={item.id} className="border-t border-border/70">
                    <td className="px-4 py-4 capitalize">{item.platform}</td>
                    <td className="px-4 py-4 font-mono text-xs">{item.contactInfo}</td>
                    <td className="px-4 py-4 font-mono text-sm text-text-secondary">{item.displayOrder}</td>
                    <td className="px-4 py-4">
                      <Badge active={item.isActive !== false} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingContact(item);
                            setShowContactModal(true);
                          }}
                          className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-secondary transition hover:bg-neutral-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteContact(item.id)}
                          className="rounded-full bg-system-danger px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={contactPage} totalPages={contactTotalPages} onPageChange={(page) => setContactPage(page)} />
      </section>

      {showInstructionModal && (
        <InstructionModal
          initialValue={editingInstruction}
          onClose={() => {
            setShowInstructionModal(false);
            setEditingInstruction(null);
          }}
          onSubmit={saveInstruction}
        />
      )}

      {showContactModal && (
        <ContactModal
          initialValue={editingContact}
          onClose={() => {
            setShowContactModal(false);
            setEditingContact(null);
          }}
          onSubmit={saveContact}
        />
      )}
    </div>
  );
}

