export const freshnessHours = 24;

export function stockState(listing, now) {
  const age = now - listing.confirmedAt;
  return age < 0 || age >= freshnessHours * 3_600_000 ? "unknown" : listing.stock;
}

export function compare({ products, branches, listings, query, area, availability, now }) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const byBranch = new Map(branches.map(branch => [branch.id, branch]));
  return products.flatMap(product => {
    const searchText = [product.name, product.variant, ...product.aliases].join(" ").toLowerCase();
    if (!words.every(word => searchText.includes(word))) return [];
    const offers = listings.flatMap(listing => {
      if (listing.product !== product.id) return [];
      const branch = byBranch.get(listing.branch);
      if (!branch || (area && branch.area !== area)) return [];
      const status = stockState(listing, now);
      if (availability && status !== availability) return [];
      return [{ ...listing, branch, status }];
    }).sort((a, b) => a.price - b.price || b.confirmedAt - a.confirmedAt);
    return offers.length ? [{ product, offers }] : [];
  });
}
