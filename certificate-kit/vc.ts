// v1 VCWrap removed: in schema v2 the VC references the on-chain certificate
// via `certificateTxid` rather than embedding a W3C wrap into OP_RETURN.
// If you need a verifiable-presentation adapter layered on top of the BRC-52
// VC, build it here.
export {};
