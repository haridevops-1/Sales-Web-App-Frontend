import React from "react";
import "./ProposalCard.css";
import { ExternalLink, ArrowUpRight } from "lucide-react";
import { formatDate } from "@/utils/helpers";
import { ShinyButton } from "@/components/ui/shiny-button";

export default function ProposalCard({
  proposal,
  onSelect
}) {
  if (!proposal) return null;

  const {
    customer_name: customer,
    industry,
    proposal_title: title,
    proposal_id: proposalId,
    created_at: createdAt,
    proposal_url: proposalUrl,
    generated_url: generatedUrl
  } = proposal;

  const businessName = customer || proposal?.content?.customer?.company_name || title || "Customer Proposal";
  const detail = industry || (createdAt ? `Created ${formatDate(createdAt)}` : "Solution Proposal");
  const targetUrl = proposalUrl || generatedUrl || (proposalId ? `https://spikra-customer-prop-msdrrgbk.onslate.com/?proposal_id=${proposalId}` : null);

  const handleOpenProposal = (e) => {
    e.stopPropagation();
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } else if (onSelect) {
      onSelect(proposal);
    }
  };

  return (
    <div className="proposal-glass-card proposal-clean-card" onClick={handleOpenProposal}>
      <div className="proposal-clean-content">
        <div className="proposal-clean-header">
          <h3 className="proposal-clean-business" title={businessName}>
            {businessName}
          </h3>
          <p className="proposal-clean-detail" title={detail}>
            {detail}
          </p>
        </div>

        <div className="proposal-clean-actions">
          <ShinyButton
            type="button"
            className="btn-proposal-view"
            onClick={handleOpenProposal}
          >
            <span className="inline-flex items-center justify-center gap-1.5 font-bold">
              <ExternalLink size={14} />
              <span>View Proposal</span>
            </span>
          </ShinyButton>
        </div>
      </div>
    </div>
  );
}
