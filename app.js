import { compare } from "./model.mjs";

const products = [
  { id:"p10", name:"Paracetamol", variant:"500 mg tablets · pack of 10", aliases:["demo pain relief"] },
  { id:"p30", name:"Paracetamol", variant:"500 mg tablets · pack of 30", aliases:["demo pain relief"] },
  { id:"ors", name:"Oral rehydration salts", variant:"Powder sachets · pack of 5", aliases:["ORS","demo rehydrate"] },
];
const branches = [
  { id:"a", name:"Example Pharmacy A", area:"Blantyre" },
  { id:"b", name:"Example Pharmacy B", area:"Blantyre" },
  { id:"c", name:"Example Pharmacy C", area:"Lilongwe" },
];
const now = Date.now(), hour = 3_600_000;
const key = "medicine-market-demo-v1";
const states = { in:"In stock", out:"Out of stock", unknown:"Stock not recently confirmed" };
const seed = [
  ["a","p10",950,"in",2],["b","p10",1200,"in",5],["c","p10",850,"in",31],
  ["a","p30",2500,"out",3],["b","p30",2800,"in",2],["c","p30",2700,"in",7],
  ["a","ors",3900,"in",6],["b","ors",4200,"out",4],["c","ors",4100,"in",1],
].map(([branch,product,price,stock,age]) => ({branch,product,price,stock,confirmedAt:now-age*hour}));

function validListing(value) {
  return value && branches.some(branch => branch.id === value.branch) &&
    products.some(product => product.id === value.product) &&
    Number.isInteger(value.price) && value.price > 0 && value.price <= 100000000 &&
    Object.hasOwn(states, value.stock) && Number.isFinite(value.confirmedAt);
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Array.isArray(saved.listings) && saved.listings.every(validListing) &&
      Array.isArray(saved.history) && saved.history.every(validListing)) return saved;
  } catch {}
  return {listings:seed, history:[]};
}

const data = load();
const $ = selector => document.querySelector(selector);
const form = $("#listing-form");
const branchSelect = form.elements.namedItem("branch");
const productSelect = form.elements.namedItem("product");
const money = new Intl.NumberFormat("en-MW");
const date = new Intl.DateTimeFormat("en-MW", {dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Blantyre"});
function node(tag,text,css) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (css) element.className = css;
  return element;
}
function option(select,value,label) {
  const item = node("option",label);
  item.value = value;
  select.append(item);
}
for (const area of new Set(branches.map(branch => branch.area))) option($("#area"),area,area);
for (const branch of branches) option(branchSelect,branch.id,branch.name+" · "+branch.area);
for (const product of products) option(productSelect,product.id,product.name+" · "+product.variant);

function render() {
  const groups = compare({products,branches,listings:data.listings,query:$("#search").value,area:$("#area").value,availability:$("#availability").value,now:Date.now()});
  const results = $("#results");
  results.replaceChildren();
  const total = groups.reduce((sum, group) => sum + group.offers.length, 0);
  $("#count").textContent = total ? total+" listings across "+groups.length+" exact product groups" : "No matching demo listings.";
  for (const {product,offers} of groups) {
    const group = node("article",undefined,"product");
    group.append(node("h3",product.name),node("p",product.variant,"muted"));
    const grid = node("div",undefined,"offers");
    for (const offer of offers) {
      const card = node("div",undefined,"offer");
      card.append(node("strong",offer.branch.name),node("p",offer.branch.area,"muted"),
        node("p","MWK "+money.format(offer.price)+" per pack","price"),
        node("p",states[offer.status],"badge "+offer.status),
        node("p","Last updated "+date.format(offer.confirmedAt)+" CAT","muted"));
      grid.append(card);
    }
    group.append(grid);
    results.append(group);
  }
  const history = $("#history");
  history.replaceChildren();
  if (!data.history.length) history.append(node("li","No changes in this browser yet."));
  for (const entry of data.history.slice(0,10)) {
    const branch = branches.find(item => item.id === entry.branch);
    const product = products.find(item => item.id === entry.product);
    history.append(node("li",date.format(entry.confirmedAt)+" CAT · "+branch.name+" · "+product.name+" "+product.variant+" · MWK "+money.format(entry.price)+" · "+states[entry.stock]));
  }
}

function loadEditor() {
  const listing = data.listings.find(entry => entry.branch === branchSelect.value && entry.product === productSelect.value);
  form.elements.namedItem("price").value = listing?.price ?? "";
  form.elements.namedItem("stock").value = listing?.stock ?? "unknown";
}
form.addEventListener("submit", event => {
  event.preventDefault();
  const values = new FormData(form);
  const entry = {branch:values.get("branch"),product:values.get("product"),price:Number(values.get("price")),stock:values.get("stock"),confirmedAt:Date.now()};
  if (!validListing(entry)) return;
  const index = data.listings.findIndex(item => item.branch === entry.branch && item.product === entry.product);
  if (index === -1) data.listings.push(entry);
  else data.listings[index] = entry;
  data.history.unshift(entry);
  data.history = data.history.slice(0,50);
  try {
    localStorage.setItem(key,JSON.stringify(data));
    $("#save-status").textContent = "Listing updated in this browser.";
  } catch {
    $("#save-status").textContent = "Listing updated for this session only.";
  }
  render();
});
branchSelect.addEventListener("change",loadEditor);
productSelect.addEventListener("change",loadEditor);
$("#search").addEventListener("input",render);
$("#area").addEventListener("change",render);
$("#availability").addEventListener("change",render);
document.addEventListener("visibilitychange",() => { if (!document.hidden) render(); });
setInterval(render, 60_000);
loadEditor();
render();
