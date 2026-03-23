"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/app/components/Navbar";
import { getAuthHeaders } from "@/lib/supabase";
import { useAuth } from "@/app/components/AuthProvider";
import { formatINR } from "@/app/lib/types";

type PropertyType = "agricultural" | "residential" | "commercial";
type AreaUnit = "sq ft" | "sq mt" | "acres" | "cents";
type OwnershipRelationship = "sole-owner" | "joint-owner" | "inherited" | "gifted";
type BinaryChoice = "yes" | "no";
type NearbyInfrastructure =
  | "Highway"
  | "Metro"
  | "Airport"
  | "IT Park"
  | "School"
  | "Hospital"
  | "Shopping Mall";
type DocumentKey =
  | "titleDeed"
  | "encumbranceCertificate"
  | "khataCertificate"
  | "propertyTaxReceipt"
  | "aadhaarCard"
  | "panCard"
  | "pahaniRtc"
  | "surveySketch"
  | "approvedBuildingPlan"
  | "occupancyCertificate"
  | "additionalDocuments";

interface FormData {
  title: string;
  type: PropertyType;
  fullAddress: string;
  city: string;
  state: string;
  pinCode: string;
  totalArea: string;
  areaUnit: AreaUnit;
  ownerFullName: string;
  ownerAadhaarNumber: string;
  ownerPanNumber: string;
  relationshipToProperty: OwnershipRelationship;
  hasOutstandingLoan: BinaryChoice;
  loanAmount: string;
  lenderName: string;
  total_value: string;
  total_shares: string;
  listedPercentage: string;
  monthlyRentalIncome: string;
  currentlyRented: BinaryChoice;
  description: string;
  investmentHighlights: string;
  nearbyInfrastructure: NearbyInfrastructure[];
  declarationLegal: boolean;
  declarationTerms: boolean;
  declarationReview: boolean;
}

interface DocumentField {
  key: DocumentKey;
  label: string;
  optional?: boolean;
  types?: PropertyType[];
}

const STEPS = [
  "Basic Details",
  "Ownership Details",
  "Financial Details",
  "Property Story",
  "Documents and Declaration",
] as const;
const DEFAULT_FRACTION_PERCENT = 60;
const TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "agricultural", label: "Agricultural" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
];
const AREA_UNITS: AreaUnit[] = ["sq ft", "sq mt", "acres", "cents"];
const OWNERSHIP_OPTIONS: { value: OwnershipRelationship; label: string }[] = [
  { value: "sole-owner", label: "Sole Owner" },
  { value: "joint-owner", label: "Joint Owner" },
  { value: "inherited", label: "Inherited" },
  { value: "gifted", label: "Gifted" },
];
const INFRASTRUCTURE_OPTIONS: NearbyInfrastructure[] = [
  "Highway",
  "Metro",
  "Airport",
  "IT Park",
  "School",
  "Hospital",
  "Shopping Mall",
];
const DOCUMENT_FIELDS: DocumentField[] = [
  { key: "titleDeed", label: "Title Deed" },
  { key: "encumbranceCertificate", label: "Encumbrance Certificate" },
  { key: "khataCertificate", label: "Khata Certificate" },
  { key: "propertyTaxReceipt", label: "Property Tax Receipt" },
  { key: "aadhaarCard", label: "Aadhaar Card" },
  { key: "panCard", label: "PAN Card" },
  { key: "pahaniRtc", label: "Pahani / RTC", types: ["agricultural"] },
  { key: "surveySketch", label: "Survey Sketch", types: ["agricultural"] },
  {
    key: "approvedBuildingPlan",
    label: "Approved Building Plan",
    types: ["residential", "commercial"],
  },
  { key: "occupancyCertificate", label: "Occupancy Certificate", optional: true },
  { key: "additionalDocuments", label: "Additional Documents", optional: true },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
});

export default function ListPropertyPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Partial<Record<DocumentKey, string>>>({});
  const [form, setForm] = useState<FormData>({
    title: "",
    type: "residential",
    fullAddress: "",
    city: "",
    state: "",
    pinCode: "",
    totalArea: "",
    areaUnit: "sq ft",
    ownerFullName: "",
    ownerAadhaarNumber: "",
    ownerPanNumber: "",
    relationshipToProperty: "sole-owner",
    hasOutstandingLoan: "no",
    loanAmount: "",
    lenderName: "",
    total_value: "",
    total_shares: "",
    listedPercentage: DEFAULT_FRACTION_PERCENT.toString(),
    monthlyRentalIncome: "",
    currentlyRented: "no",
    description: "",
    investmentHighlights: "",
    nearbyInfrastructure: [],
    declarationLegal: false,
    declarationTerms: false,
    declarationReview: false,
  });

  const update = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const updateBoolean = (key: keyof FormData, value: boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const { user } = useAuth();

  const visibleDocumentFields = useMemo(
    () => DOCUMENT_FIELDS.filter((field) => !field.types || field.types.includes(form.type)),
    [form.type]
  );

  const location = [form.fullAddress, form.city, form.state, form.pinCode].filter(Boolean).join(", ");

  const totalValueNumber = Number(form.total_value);
  const totalSharesNumber = Number(form.total_shares);
  const listedPercentageNumber = Number(form.listedPercentage);
  const calculatedSharePrice =
    Number.isFinite(totalValueNumber) &&
    Number.isFinite(totalSharesNumber) &&
    totalValueNumber > 0 &&
    totalSharesNumber > 0
      ? totalValueNumber / totalSharesNumber
      : null;

  const formattedSharePrice = calculatedSharePrice != null
    ? formatINR(calculatedSharePrice)
    : "Awaiting inputs";
  const isListedPercentageValid = Number.isInteger(listedPercentageNumber) && listedPercentageNumber >= 1 && listedPercentageNumber <= 100;
  const ownerRetainedPercentage = isListedPercentageValid ? 100 - listedPercentageNumber : null;

  const canNext =
    step === 0
      ? Boolean(
          form.title &&
          form.type &&
          form.fullAddress &&
          form.city &&
          form.state &&
          form.pinCode &&
          form.totalArea
        )
      : step === 1
        ? Boolean(
            form.ownerFullName &&
            form.ownerAadhaarNumber &&
            form.ownerPanNumber &&
            form.relationshipToProperty &&
            form.hasOutstandingLoan &&
            (form.hasOutstandingLoan === "no" || (form.loanAmount && form.lenderName))
          )
        : step === 2
          ? Boolean(
              form.total_value &&
              form.total_shares &&
              calculatedSharePrice != null &&
              form.currentlyRented &&
              isListedPercentageValid
            )
          : step === 3
            ? Boolean(form.description && form.investmentHighlights)
            : Boolean(form.declarationLegal && form.declarationTerms && form.declarationReview);

  const stepCopy = [
    {
      eyebrow: "Step 1",
      title: "Anchor the asset clearly",
      detail: "Give Landly enough address and size context to position the property as a credible listing candidate.",
    },
    {
      eyebrow: "Step 2",
      title: "Establish ownership context",
      detail: "Keep the ownership details concise, direct, and believable for a first-pass verification review.",
    },
    {
      eyebrow: "Step 3",
      title: "Set the financial structure",
      detail: "Landly derives the per-share ticket live so the listing reads like a structured opportunity rather than a rough estimate.",
    },
    {
      eyebrow: "Step 4",
      title: "Explain why this property matters",
      detail: "A short, specific story gives the admin team and future investors enough narrative context to trust the opportunity.",
    },
    {
      eyebrow: "Step 5",
      title: "Attach proof and confirm intent",
      detail: "Document inputs stay optional for the demo, but the layout reflects a real verification workflow and a final submission check.",
    },
  ] as const;

  const reviewRows = [
    { label: "Property Title", value: form.title || "Not provided" },
    { label: "Property Type", value: TYPE_OPTIONS.find((option) => option.value === form.type)?.label ?? "Not provided" },
    { label: "Full Address", value: form.fullAddress || "Not provided" },
    { label: "City", value: form.city || "Not provided" },
    { label: "State", value: form.state || "Not provided" },
    { label: "Pin Code", value: form.pinCode || "Not provided" },
    { label: "Total Area", value: form.totalArea ? `${form.totalArea} ${form.areaUnit}` : "Not provided" },
    { label: "Owner Name", value: form.ownerFullName || "Not provided" },
    { label: "Aadhaar", value: form.ownerAadhaarNumber || "Not provided" },
    { label: "PAN", value: form.ownerPanNumber || "Not provided" },
    {
      label: "Relationship",
      value: OWNERSHIP_OPTIONS.find((option) => option.value === form.relationshipToProperty)?.label ?? "Not provided",
    },
    {
      label: "Outstanding Loan",
      value: form.hasOutstandingLoan === "yes"
        ? `${form.loanAmount ? formatINR(Number(form.loanAmount)) : "Amount pending"} • ${form.lenderName || "Lender pending"}`
        : "No",
    },
    { label: "Owner Asking Valuation", value: form.total_value ? formatINR(Number(form.total_value)) : "Not provided" },
    { label: "Total Shares", value: form.total_shares || "Not provided" },
    { label: "Price Per Share", value: formattedSharePrice },
    {
      label: "Listed for Investors",
      value: isListedPercentageValid ? `${listedPercentageNumber}%` : "Not provided",
    },
    {
      label: "Owner Retains",
      value: ownerRetainedPercentage != null ? `${ownerRetainedPercentage}%` : "Not provided",
    },
    {
      label: "Monthly Rental Income",
      value: form.monthlyRentalIncome ? formatINR(Number(form.monthlyRentalIncome)) : "Optional / not provided",
    },
    { label: "Currently Rented", value: form.currentlyRented === "yes" ? "Yes" : "No" },
  ];

  function handleInfrastructureToggle(item: NearbyInfrastructure) {
    setForm((prev) => ({
      ...prev,
      nearbyInfrastructure: prev.nearbyInfrastructure.includes(item)
        ? prev.nearbyInfrastructure.filter((entry) => entry !== item)
        : [...prev.nearbyInfrastructure, item],
    }));
  }

  function handleFileChange(key: DocumentKey, event: ChangeEvent<HTMLInputElement>) {
    const fileName = event.target.files?.[0]?.name ?? "";
    setUploadedFiles((prev) => ({ ...prev, [key]: fileName }));
  }

  const handleSubmit = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/properties/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          title: form.title,
          location,
          type: form.type,
          description: form.description,
          totalValue: Number(form.total_value),
          totalShares: Number(form.total_shares),
          sharePrice: calculatedSharePrice,
          imageUrl: "",
          fractionPercent: listedPercentageNumber,
          estimatedYield: null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setSubmitError(data.error || "Failed to submit listing");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  const inputClass =
    "w-full rounded-[var(--radius-land)] border border-landly-slate/20 bg-landly-navy-deep/60 px-4 py-3 text-sm text-landly-offwhite placeholder:text-landly-slate/50 focus:border-landly-gold/50 focus:outline-none focus:ring-1 focus:ring-landly-gold/30 transition-colors";
  const sectionTitleClass = "text-[11px] font-semibold uppercase tracking-[0.18em] text-landly-gold";
  const currentStep = stepCopy[step];
  const uploadedCount = Object.values(uploadedFiles).filter(Boolean).length;

  return (
    <div className="flex min-h-svh flex-col bg-landly-navy">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-24 pb-16 md:pt-28">
        {submitted ? (
          /* Success state */
          <motion.div
            className="flex flex-col items-center justify-center py-24 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-landly-green/15"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <svg className="h-10 w-10 text-landly-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <h2 className="font-sans text-2xl font-bold text-landly-offwhite">Property Submitted</h2>
            <p className="mt-2 max-w-sm text-sm text-landly-slate">
              Your listing for <span className="text-landly-gold">{form.title} </span> is now queued for Landly&apos;s review team. Core listing details were submitted cleanly, while supporting documents stay optional for the demo flow.
            </p>
          </motion.div>
        ) : (
          <>
            <motion.div {...fadeUp()}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-landly-gold">For Landowners</p>
              <div className="mt-4 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                <div>
                  <h1 className="font-sans text-4xl font-bold tracking-tight text-landly-offwhite md:text-5xl">
                    Submit a listing that feels credible from the first review.
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-landly-slate md:text-base">
                    This flow is structured to feel serious and premium without becoming a heavy legal intake. Core fields go straight into the current listing API, while supporting proof stays ready in the UI for a more complete demo.
                  </p>
                </div>
                <div className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/45 p-5">
                  <p className={sectionTitleClass}>Current pricing structure</p>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-landly-slate">Price per share</p>
                      <p className={`mt-2 font-mono text-3xl font-semibold ${calculatedSharePrice != null ? "text-landly-gold" : "text-landly-slate"}`}>
                        {formattedSharePrice}
                      </p>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.16em] text-landly-slate">
                      <p>{isListedPercentageValid ? listedPercentageNumber : DEFAULT_FRACTION_PERCENT}% listed</p>
                      <p className="mt-1">{ownerRetainedPercentage ?? (100 - DEFAULT_FRACTION_PERCENT)}% retained</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <section>
                <motion.div className="flex flex-wrap items-center gap-2" {...fadeUp(0.05)}>
                  {STEPS.map((label, index) => (
                    <button
                      key={label}
                      onClick={() => index < step && setStep(index)}
                      className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-left text-sm transition-all ${
                        index === step
                          ? "border-landly-gold/50 bg-landly-gold/10 text-landly-offwhite"
                          : index < step
                            ? "border-landly-green/30 bg-landly-green/5 text-landly-offwhite/85"
                            : "border-landly-slate/15 text-landly-slate"
                      }`}
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        index <= step ? "bg-landly-gold text-landly-navy-deep" : "border border-landly-slate/20 text-landly-slate"
                      }`}>
                        {index + 1}
                      </span>
                      <span>{label}</span>
                    </button>
                  ))}
                </motion.div>

                <motion.div className="mt-8 rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/45 p-6 md:p-7" {...fadeUp(0.08)}>
                  <p className={sectionTitleClass}>{currentStep.eyebrow}</p>
                  <h2 className="mt-3 font-sans text-2xl font-bold text-landly-offwhite">{currentStep.title}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-landly-slate">{currentStep.detail}</p>

                  <AnimatePresence mode="wait">
                    {step === 0 && (
                      <motion.div key="step-0" className="mt-8 space-y-6" {...fadeUp(0.1)}>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Property Title</label>
                          <input className={inputClass} placeholder="e.g. Whitefield income apartment" value={form.title} onChange={(event) => update("title", event.target.value)} />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Property Type</label>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {TYPE_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setForm((prev) => ({ ...prev, type: option.value }))}
                                className={`rounded-[var(--radius-land)] border px-4 py-3 text-sm font-medium transition-all ${
                                  form.type === option.value
                                    ? "border-landly-gold/60 bg-landly-gold/10 text-landly-gold"
                                    : "border-landly-slate/15 text-landly-slate hover:border-landly-slate/30"
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Full Address</label>
                            <textarea className={`${inputClass} min-h-[96px] resize-none`} placeholder="Street, locality, landmark" value={form.fullAddress} onChange={(event) => update("fullAddress", event.target.value)} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">City</label>
                            <input className={inputClass} placeholder="Bengaluru" value={form.city} onChange={(event) => update("city", event.target.value)} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">State</label>
                            <input className={inputClass} placeholder="Karnataka" value={form.state} onChange={(event) => update("state", event.target.value)} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Pin Code</label>
                            <input className={inputClass} inputMode="numeric" placeholder="560066" value={form.pinCode} onChange={(event) => update("pinCode", event.target.value)} />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                            <div>
                              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Total Area</label>
                              <input className={inputClass} inputMode="decimal" placeholder="2400" value={form.totalArea} onChange={(event) => update("totalArea", event.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Area Unit</label>
                              <select className={inputClass} value={form.areaUnit} onChange={(event) => setForm((prev) => ({ ...prev, areaUnit: event.target.value as AreaUnit }))}>
                                {AREA_UNITS.map((unit) => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {step === 1 && (
                      <motion.div key="step-1" className="mt-8 space-y-6" {...fadeUp(0.1)}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Owner Full Name</label>
                            <input className={inputClass} placeholder="As per ownership record" value={form.ownerFullName} onChange={(event) => update("ownerFullName", event.target.value)} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Relationship to Property</label>
                            <select className={inputClass} value={form.relationshipToProperty} onChange={(event) => setForm((prev) => ({ ...prev, relationshipToProperty: event.target.value as OwnershipRelationship }))}>
                              {OWNERSHIP_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Owner Aadhaar Number</label>
                            <input className={inputClass} inputMode="numeric" placeholder="12-digit Aadhaar" value={form.ownerAadhaarNumber} onChange={(event) => update("ownerAadhaarNumber", event.target.value)} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Owner PAN Number</label>
                            <input className={inputClass} placeholder="ABCDE1234F" value={form.ownerPanNumber} onChange={(event) => update("ownerPanNumber", event.target.value.toUpperCase())} />
                          </div>
                        </div>

                        <div>
                          <label className="mb-3 block text-xs font-medium uppercase tracking-wider text-landly-slate">Outstanding Loans Against Property</label>
                          <div className="flex gap-3">
                            {[
                              { value: "yes", label: "Yes" },
                              { value: "no", label: "No" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setForm((prev) => ({
                                  ...prev,
                                  hasOutstandingLoan: option.value as BinaryChoice,
                                  ...(option.value === "no" ? { loanAmount: "", lenderName: "" } : {}),
                                }))}
                                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                                  form.hasOutstandingLoan === option.value
                                    ? "border-landly-gold/60 bg-landly-gold/10 text-landly-gold"
                                    : "border-landly-slate/20 text-landly-slate"
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {form.hasOutstandingLoan === "yes" && (
                          <motion.div className="grid gap-4 md:grid-cols-2" {...fadeUp(0.02)}>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Loan Amount</label>
                              <input className={inputClass} type="number" placeholder="2500000" value={form.loanAmount} onChange={(event) => update("loanAmount", event.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Lender Name</label>
                              <input className={inputClass} placeholder="HDFC Bank" value={form.lenderName} onChange={(event) => update("lenderName", event.target.value)} />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div key="step-2" className="mt-8 space-y-6" {...fadeUp(0.1)}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Owner Asking Valuation (₹)</label>
                            <input className={inputClass} type="number" placeholder="12500000" value={form.total_value} onChange={(event) => update("total_value", event.target.value)} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Total Shares</label>
                            <input className={inputClass} type="number" placeholder="5000" value={form.total_shares} onChange={(event) => update("total_shares", event.target.value)} />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Listed for Investors (%)</label>
                            <input
                              className={inputClass}
                              type="number"
                              min="1"
                              max="100"
                              placeholder="60"
                              value={form.listedPercentage}
                              onChange={(event) => update("listedPercentage", event.target.value)}
                            />
                            <p className="mt-2 text-xs leading-relaxed text-landly-slate">
                              Landly lists only the selected portion for investors while you retain the remainder of the asset.
                            </p>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Owner Retains (%)</label>
                            <div className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/40 px-4 py-3">
                              <p className={`font-mono text-lg font-semibold ${ownerRetainedPercentage != null ? "text-landly-offwhite" : "text-landly-slate"}`}>
                                {ownerRetainedPercentage != null ? `${ownerRetainedPercentage}%` : "Awaiting valid split"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Monthly Rental Income (optional)</label>
                            <input className={inputClass} type="number" placeholder="85000" value={form.monthlyRentalIncome} onChange={(event) => update("monthlyRentalIncome", event.target.value)} />
                          </div>
                          <div>
                            <label className="mb-3 block text-xs font-medium uppercase tracking-wider text-landly-slate">Currently Rented</label>
                            <div className="flex gap-3">
                              {[
                                { value: "yes", label: "Yes" },
                                { value: "no", label: "No" },
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => setForm((prev) => ({ ...prev, currentlyRented: option.value as BinaryChoice }))}
                                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                                    form.currentlyRented === option.value
                                      ? "border-landly-gold/60 bg-landly-gold/10 text-landly-gold"
                                      : "border-landly-slate/20 text-landly-slate"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy/40 p-5">
                          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                            <div>
                              <p className={sectionTitleClass}>Read-only pricing summary</p>
                              <p className="mt-2 max-w-xl text-sm leading-relaxed text-landly-slate">
                                Price per share updates live from asking valuation divided by total shares. The summary is kept in DM Mono to match the rest of Landly&apos;s financial surfaces.
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase tracking-[0.16em] text-landly-slate">Price per share</p>
                              <p className={`mt-2 font-mono text-3xl font-semibold ${calculatedSharePrice != null ? "text-landly-gold" : "text-landly-slate"}`}>{formattedSharePrice}</p>
                            </div>
                          </div>
                          <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/40 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Valuation</p>
                              <p className="mt-1 font-mono text-sm font-semibold text-landly-offwhite">{form.total_value ? formatINR(Number(form.total_value)) : "Awaiting inputs"}</p>
                            </div>
                            <div className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/40 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Shares</p>
                              <p className="mt-1 font-mono text-sm font-semibold text-landly-offwhite">{form.total_shares || "Awaiting inputs"}</p>
                            </div>
                            <div className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/40 px-4 py-3">
                              <p className="text-[10px] uppercase tracking-[0.16em] text-landly-slate">Listing structure</p>
                              <p className="mt-1 font-mono text-sm font-semibold text-landly-offwhite">
                                {isListedPercentageValid ? `${listedPercentageNumber}% listed` : "Awaiting valid split"}
                              </p>
                              <p className="mt-1 text-xs text-landly-slate">
                                {ownerRetainedPercentage != null ? `${ownerRetainedPercentage}% retained` : "Owner retained updates automatically"}
                              </p>
                            </div>
                          </div>
                          {!isListedPercentageValid && (
                            <p className="mt-4 text-sm text-landly-red">
                              Listed percentage must be a whole number between 1 and 100.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div key="step-3" className="mt-8 space-y-6" {...fadeUp(0.1)}>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Description</label>
                          <textarea className={`${inputClass} min-h-[120px] resize-none`} placeholder="Describe the property, surrounding area, and current condition in a way that feels clear and credible." value={form.description} onChange={(event) => update("description", event.target.value)} />
                        </div>

                        <div>
                          <label className="mb-3 block text-xs font-medium uppercase tracking-wider text-landly-slate">Nearby Infrastructure</label>
                          <div className="flex flex-wrap gap-3">
                            {INFRASTRUCTURE_OPTIONS.map((item) => {
                              const selected = form.nearbyInfrastructure.includes(item);
                              return (
                                <button
                                  key={item}
                                  onClick={() => handleInfrastructureToggle(item)}
                                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                                    selected
                                      ? "border-landly-green/40 bg-landly-green/10 text-landly-offwhite"
                                      : "border-landly-slate/20 text-landly-slate hover:border-landly-slate/35"
                                  }`}
                                >
                                  {item}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-landly-slate">Investment Highlights</label>
                          <textarea className={`${inputClass} min-h-[104px] resize-none`} placeholder="Summarize why this asset is attractive: location strength, rental demand, development corridor, or land appreciation potential." value={form.investmentHighlights} onChange={(event) => update("investmentHighlights", event.target.value)} />
                        </div>
                      </motion.div>
                    )}

                    {step === 4 && (
                      <motion.div key="step-4" className="mt-8 space-y-8" {...fadeUp(0.1)}>
                        <div>
                          <p className={sectionTitleClass}>Supporting documents</p>
                          <p className="mt-2 text-sm leading-relaxed text-landly-slate">
                            These uploads are visible for a credible verification workflow but they are not required to finish the demo submission.
                          </p>
                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            {visibleDocumentFields.map((field) => (
                              <label key={field.key} className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy/40 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-landly-offwhite">{field.label}</p>
                                    <p className="mt-1 text-xs text-landly-slate">{field.optional ? "Optional for submission" : "Recommended for review readiness"}</p>
                                  </div>
                                  {uploadedFiles[field.key] ? (
                                    <span className="rounded-full bg-landly-green/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-landly-green">Added</span>
                                  ) : (
                                    <span className="rounded-full bg-landly-slate/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-landly-slate">Pending</span>
                                  )}
                                </div>
                                <input className="mt-4 block w-full text-xs text-landly-slate file:mr-4 file:rounded-full file:border-0 file:bg-landly-gold/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-landly-gold hover:file:bg-landly-gold/15" type="file" onChange={(event) => handleFileChange(field.key, event)} />
                                {uploadedFiles[field.key] && (
                                  <p className="mt-2 truncate text-xs text-landly-offwhite/80">{uploadedFiles[field.key]}</p>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className={sectionTitleClass}>Declaration</p>
                          <div className="mt-4 space-y-3">
                            {[
                              {
                                key: "declarationLegal",
                                label: "I confirm this property is free of legal disputes to the best of my knowledge",
                              },
                              {
                                key: "declarationTerms",
                                label: "I agree to Landly’s property listing terms",
                              },
                              {
                                key: "declarationReview",
                                label: "I consent to document review by Landly’s verification team",
                              },
                            ].map((item) => (
                              <label key={item.key} className="flex items-start gap-3 rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy/35 px-4 py-3 text-sm text-landly-offwhite/85">
                                <input type="checkbox" checked={form[item.key as keyof FormData] as boolean} onChange={(event) => updateBoolean(item.key as keyof FormData, event.target.checked)} className="mt-1 h-4 w-4 rounded border-landly-slate/30 bg-landly-navy-deep text-landly-gold focus:ring-landly-gold/40" />
                                <span>{item.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy/35 p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className={sectionTitleClass}>Final review</p>
                              <p className="mt-2 text-sm text-landly-slate">Every field shown in the flow appears here before submission so the form never asks for information that disappears later.</p>
                            </div>
                            <div className="text-right text-xs uppercase tracking-[0.16em] text-landly-slate">
                              <p>{uploadedCount} document{uploadedCount === 1 ? "" : "s"} added</p>
                              <p className="mt-1">Core payload ready</p>
                            </div>
                          </div>

                          <div className="mt-6 grid gap-6 lg:grid-cols-2">
                            <div className="space-y-3">
                              {reviewRows.map((row) => (
                                <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-landly-slate/5 pb-3">
                                  <span className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">{row.label}</span>
                                  <span className="max-w-[58%] text-right font-mono text-sm text-landly-offwhite">{row.value}</span>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-5">
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">Description</p>
                                <p className="mt-2 text-sm leading-relaxed text-landly-offwhite/80">{form.description || "Not provided"}</p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">Nearby Infrastructure</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {form.nearbyInfrastructure.length > 0 ? form.nearbyInfrastructure.map((item) => (
                                    <span key={item} className="rounded-full border border-landly-green/25 bg-landly-green/10 px-3 py-1 text-xs text-landly-offwhite/85">{item}</span>
                                  )) : <span className="text-sm text-landly-slate">None selected</span>}
                                </div>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">Investment Highlights</p>
                                <p className="mt-2 text-sm leading-relaxed text-landly-offwhite/80">{form.investmentHighlights || "Not provided"}</p>
                              </div>
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">Submission payload</p>
                                <p className="mt-2 text-sm leading-relaxed text-landly-slate">
                                  Landly will submit title, combined location, property type, description, valuation, total shares, computed price per share, and your selected investor allocation as `fractionPercent`. Ownership, infrastructure, and document fields are preserved in the UI for a stronger demo and future backend expansion.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div className="mt-8 flex justify-between" {...fadeUp(0.15)}>
                  {step > 0 ? (
                    <button onClick={() => setStep(step - 1)} className="text-sm font-medium text-landly-slate transition-colors hover:text-landly-offwhite">
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < STEPS.length - 1 ? (
                    <button
                      onClick={() => canNext && setStep(step + 1)}
                      disabled={!canNext}
                      className="rounded-[var(--radius-land)] bg-landly-gold px-8 py-3 text-sm font-semibold text-landly-navy-deep transition-all hover:bg-landly-gold/90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !canNext}
                      className="rounded-[var(--radius-land)] bg-landly-green px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-landly-green/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Submitting…" : "Submit for Review"}
                    </button>
                  )}
                </motion.div>
              </section>

              <motion.aside className="lg:pt-[4.5rem]" {...fadeUp(0.12)}>
                <div className="sticky top-28 space-y-4 rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy-deep/45 p-5">
                  <div>
                    <p className={sectionTitleClass}>Listing brief</p>
                    <h3 className="mt-3 font-sans text-xl font-semibold text-landly-offwhite">Submission snapshot</h3>
                    <p className="mt-2 text-sm leading-relaxed text-landly-slate">
                      A restrained side summary keeps the flow easy to scan while reinforcing the financial and verification posture of the listing.
                    </p>
                  </div>

                  <div className="space-y-3 border-t border-landly-slate/10 pt-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">Address</span>
                      <span className="max-w-[65%] text-right text-sm text-landly-offwhite/80">{location || "Awaiting basic details"}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">Area</span>
                      <span className="font-mono text-sm text-landly-offwhite">{form.totalArea ? `${form.totalArea} ${form.areaUnit}` : "Awaiting inputs"}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">Owner</span>
                      <span className="text-right text-sm text-landly-offwhite/80">{form.ownerFullName || "Awaiting ownership details"}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">Valuation</span>
                      <span className="font-mono text-sm text-landly-gold">{form.total_value ? formatINR(Number(form.total_value)) : "Awaiting inputs"}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">Share price</span>
                      <span className={`font-mono text-sm ${calculatedSharePrice != null ? "text-landly-gold" : "text-landly-slate"}`}>{formattedSharePrice}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">Listed split</span>
                      <span className="font-mono text-sm text-landly-offwhite">
                        {isListedPercentageValid ? `${listedPercentageNumber}% listed / ${ownerRetainedPercentage}% retained` : "Awaiting valid split"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">What is fully wired</p>
                    <ul className="mt-3 space-y-2 text-sm text-landly-offwhite/80">
                      <li>Title, type, combined location, description, valuation, total shares, computed share price</li>
                      <li>User-selected listed percentage now submits as `fractionPercent`, with owner retention derived in the UI</li>
                    </ul>
                  </div>

                  <div className="rounded-[var(--radius-land)] border border-landly-slate/10 bg-landly-navy/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-landly-slate">UI-ready for later backend support</p>
                    <ul className="mt-3 space-y-2 text-sm text-landly-offwhite/80">
                      <li>Ownership identity, loan context, rental fields, nearby infrastructure, investment highlights</li>
                      <li>Document upload selectors and declarations for a believable review workflow</li>
                    </ul>
                  </div>
                </div>
              </motion.aside>
            </div>

            {submitError && (
              <p className="mt-3 text-center text-sm text-landly-red">{submitError}</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
