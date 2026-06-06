-- ===========================================================================
-- Tracklock — seed data
-- Standard Protection Terms v1.0 (PLACEHOLDER — must be reviewed by a
-- qualified music/IP lawyer before public launch).
-- ===========================================================================

insert into public.legal_templates (version, title, body, governing_law, effective_date, active)
values (
  '1.0',
  'Tracklock Standard Protection Terms',
  $TERMS$PLACEHOLDER — SUBJECT TO LEGAL REVIEW. These Standard Protection Terms have not yet been reviewed by a qualified music/IP lawyer and are provided for product development only.

1. Purpose of this record. This document is a Split Confirmation Agreement. It records the publishing/composition split percentages that the named collaborators (the "Parties") have agreed for the identified track.

2. Authority. Each Party confirms that they have the authority to agree their own share of the publishing/composition split shown in this record.

3. Accuracy of splits. Each Party confirms that the publishing split percentages listed reflect the agreement reached between the Parties for this track, and that the information they personally provided is accurate to the best of their knowledge.

4. Nature of the record. The Parties acknowledge that this is a confirmation record of their agreed splits. It is not a publishing administration agreement, an assignment of copyright, or a recording/master agreement.

5. Changes require a new version. Any change to a split percentage, collaborator, role or other material term requires a new version of this agreement to be created and signed by all affected Parties. The Parties agree not to alter the locked record outside the Tracklock platform.

6. Permitted sharing. The Parties agree that the locked record may be shared with managers, lawyers, accountants, labels, publishers, distributors and collection societies for legitimate administration and release purposes.

7. Role of Tracklock. The Parties acknowledge that Tracklock is a technology provider only. Tracklock is not a law firm, legal adviser, publisher, manager, label, distributor or rights owner, and does not provide legal advice.

8. No transfer of rights to Tracklock. Tracklock does not acquire any ownership of, or interest in, any music, composition, publishing right, master right, royalty or other intellectual property by providing the software. Each Party retains their respective rights.

9. Electronic signatures. The Parties intend that the electronic signatures and confirmations captured through Tracklock are valid and admissible evidence of their agreement.

10. Responsibility for information. Each Party is responsible for the accuracy of the information they provide. Disputes between collaborators remain matters between those collaborators and not Tracklock.

11. Independent advice. Each Party may seek independent legal advice before signing. The Parties are encouraged to do so where they consider it appropriate.

12. Data, audit and retention. The Parties accept that Tracklock processes their data, maintains an audit log of relevant events, and retains the locked document and its associated records as part of providing the service.

13. Governing law. These terms are governed by the law stated for this agreement (default: the law of England and Wales), subject to legal review.

DISCLAIMER: Tracklock is not a law firm and does not provide legal advice. This document does not constitute legal advice. Parties should seek independent legal advice where required.$TERMS$,
  'England and Wales',
  current_date,
  true
)
on conflict (version) do nothing;
