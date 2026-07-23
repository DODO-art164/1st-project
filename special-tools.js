const fmtMoney=v=>`${Math.round(v).toLocaleString('ko-KR')}원`;
const fmtNumber=(v,d=1)=>Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d});
const get=id=>Math.max(Number(document.getElementById(id)?.value)||0,0);
const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
const diagnose=(type,text)=>{const box=document.getElementById('tool-diagnosis');if(!box)return;box.className=`diagnosis ${type||''}`;box.innerHTML=`<span>진단</span><p>${text}</p>`};
const badge=(type,text)=>{const el=document.getElementById('tool-badge');if(!el)return;el.className=`result-badge ${type}`;el.textContent=text};

function calcStartup(){
  const production=get('startup-production');
  const sample=get('startup-sample');
  const shooting=get('startup-shooting');
  const packageCost=get('startup-package');
  const site=get('startup-site');
  const marketing=get('startup-marketing');
  const admin=get('startup-admin');
  const monthly=get('startup-monthly');
  const reserveMonths=get('startup-reserve-months');
  const contingency=get('startup-contingency')/100;
  const subtotal=production+sample+shooting+packageCost+site+marketing+admin+(monthly*reserveMonths);
  const buffer=subtotal*contingency;
  const total=subtotal+buffer;
  set('startup-total',fmtMoney(total));
  set('startup-fixed',fmtMoney(site+admin));
  set('startup-operating',fmtMoney(monthly*reserveMonths));
  set('startup-buffer',fmtMoney(buffer));
  if(total<3000000){badge('warning','초소형 테스트형');diagnose('warning','가능한 자본은 작지만 생산 수량과 촬영·광고비가 매우 제한적입니다. 첫 상품 수를 줄이고 예약판매나 소량 테스트를 고려하세요.');}
  else if(total<10000000){badge('good','소규모 현실형');diagnose('good','소규모 브랜드를 검증하기에 비교적 현실적인 범위입니다. 운영 예비비를 생산비와 분리해 보유하세요.');}
  else{badge('neutral','본격 운영형');diagnose('neutral','초기 투자가 큰 편입니다. 생산비를 한 번에 집행하기 전에 샘플·콘텐츠·수요 검증 단계를 나누는 것이 안전합니다.');}
}

function calcClothingCost(){
  const fabric=get('cost-fabric');
  const sewing=get('cost-sewing');
  const trim=get('cost-trim');
  const wash=get('cost-wash');
  const packing=get('cost-packing');
  const freight=get('cost-freight');
  const qty=Math.max(get('cost-qty'),1);
  const development=get('cost-development');
  const defect=Math.min(get('cost-defect')/100,.95);
  const variable=fabric+sewing+trim+wash+packing+freight;
  const developmentPerUnit=development/qty;
  const accountingCost=variable+developmentPerUnit;
  const sellableRate=1-defect;
  const effectiveCost=sellableRate>0?accountingCost/sellableRate:0;
  const suggested=Math.ceil((effectiveCost/0.35)/1000)*1000;
  set('cost-unit',fmtMoney(accountingCost));
  set('cost-effective',fmtMoney(effectiveCost));
  set('cost-total',fmtMoney(accountingCost*qty));
  set('cost-price',fmtMoney(suggested));
  if(defect>=.08){badge('danger','불량률 높음');diagnose('danger','예상 불량률이 높아 실질 원가가 크게 상승합니다. 생산처 품질 기준과 검수 비용을 먼저 점검하세요.');}
  else if(developmentPerUnit>variable*.3){badge('warning','소량 생산 영향 큼');diagnose('warning','샘플·패턴비의 개당 배부액이 큽니다. 첫 생산에서 정상적일 수 있지만 재생산 시 원가가 낮아지는지 구분해 보세요.');}
  else{badge('good','원가 구조 확인');diagnose('good','불량률과 개발비까지 포함한 실질 원가입니다. 판매가 결정 시 수수료·광고비·반품비도 추가로 반영하세요.');}
}

function calcDiscount(){
  const price=get('discount-price');
  const cost=get('discount-cost');
  const feeRate=Math.min(get('discount-fee')/100,.99);
  const adRate=Math.min(get('discount-ad')/100,.99);
  const shipping=get('discount-shipping');
  const discountRate=Math.min(get('discount-rate')/100,.99);
  const salePrice=price*(1-discountRate);
  const fee=salePrice*feeRate;
  const ad=salePrice*adRate;
  const profit=salePrice-cost-fee-ad-shipping;
  const margin=salePrice?profit/salePrice*100:0;
  const denominator=price*(1-feeRate-adRate);
  const maxDiscount=denominator>0?Math.max(0,Math.min(1-(cost+shipping)/denominator,1))*100:0;
  set('discount-sale-price',fmtMoney(salePrice));
  set('discount-profit',fmtMoney(profit));
  set('discount-margin',`${margin.toFixed(1)}%`);
  set('discount-max',`${maxDiscount.toFixed(1)}%`);
  if(profit<0){badge('danger','할인 시 적자');diagnose('danger',`현재 할인율에서는 1건당 약 ${fmtMoney(Math.abs(profit))} 손실입니다. 할인율을 낮추거나 광고비를 줄이세요.`);}
  else if(margin<10){badge('warning','이익 여유 부족');diagnose('warning','이익은 남지만 쿠폰 중복·반품이 발생하면 적자로 바뀔 수 있습니다. 안전 할인율보다 낮게 운영하는 것이 좋습니다.');}
  else{badge('good','할인 가능');diagnose('good','현재 입력값 기준으로 할인 후에도 이익이 남습니다. 실제 쿠폰·적립금·반품 비용까지 포함해 최종 확인하세요.');}
}

function calcRoas(){
  const revenue=get('roas-revenue');
  const ad=get('roas-ad');
  const grossMarginRate=Math.min(get('roas-gross-margin')/100,.99);
  const extraRate=Math.min(get('roas-extra-rate')/100,.99);
  const grossProfit=revenue*grossMarginRate;
  const extra=revenue*extraRate;
  const adProfit=grossProfit-extra-ad;
  const roas=ad>0?revenue/ad*100:0;
  const contributionRate=grossMarginRate-extraRate;
  const breakEven=contributionRate>0?100/contributionRate:0;
  set('roas-current',ad>0?`${Math.round(roas)}%`:'-');
  set('roas-profit',fmtMoney(adProfit));
  set('roas-break-even',breakEven>0?`${Math.ceil(breakEven)}%`:'계산 불가');
  set('roas-max-ad',fmtMoney(Math.max(grossProfit-extra,0)));
  if(adProfit<0){badge('danger','광고 적자');diagnose('danger','현재 ROAS가 손익분기 ROAS보다 낮습니다. 매출 확대보다 소재·타깃·상품 마진 개선이 우선입니다.');}
  else if(roas<breakEven*1.2){badge('warning','여유 적음');diagnose('warning','광고 이익은 남지만 효율이 조금만 떨어져도 적자로 전환될 수 있습니다. 예산 증액은 단계적으로 진행하세요.');}
  else{badge('good','광고 수익 양호');diagnose('good','현재 가정에서는 광고비를 제외하고도 이익이 남습니다. 채널별·상품별로 같은 계산을 나눠 확인하세요.');}
}

function calcMarketplace(){
  const price=get('market-price');
  const cost=get('market-cost');
  const platform=Math.min(get('market-platform')/100,.99);
  const payment=Math.min(get('market-payment')/100,.99);
  const ad=Math.min(get('market-ad')/100,.99);
  const shipping=get('market-shipping');
  const returnRate=Math.min(get('market-return')/100,.95);
  const returnLoss=get('market-return-loss');
  const kept=1-returnRate;
  const revenue=price*kept;
  const fees=revenue*(platform+payment);
  const adCost=price*ad;
  const profit=revenue-(cost*kept)-fees-adCost-shipping-(returnRate*returnLoss);
  const payout=revenue-fees-adCost;
  const margin=price?profit/price*100:0;
  const feeAmount=fees+adCost;
  set('market-profit',fmtMoney(profit));
  set('market-payout',fmtMoney(payout));
  set('market-fees',fmtMoney(feeAmount));
  set('market-margin',`${margin.toFixed(1)}%`);
  if(profit<0){badge('danger','채널 판매 적자');diagnose('danger','수수료와 광고비를 반영하면 판매할수록 손실이 발생합니다. 채널 전용 판매가 또는 수수료가 낮은 채널을 검토하세요.');}
  else if(margin<12){badge('warning','채널 의존 위험');diagnose('warning','플랫폼 매출은 만들 수 있지만 이익 여유가 낮습니다. 할인·쿠폰 분담 조건을 추가하면 적자가 될 수 있습니다.');}
  else{badge('good','판매 가능 구조');diagnose('good','현재 입력값 기준으로 채널 판매 후 이익이 남습니다. 실제 정산서와 비교해 수수료율을 주기적으로 업데이트하세요.');}
}

const calculators={startup:calcStartup,cost:calcClothingCost,discount:calcDiscount,roas:calcRoas,marketplace:calcMarketplace};
const tool=document.body.dataset.tool;
const calculator=calculators[tool];
if(calculator){
  const form=document.querySelector('[data-calculator-form]');
  form?.addEventListener('submit',e=>{e.preventDefault();calculator();});
  form?.querySelectorAll('input').forEach(input=>input.addEventListener('input',calculator));
  calculator();
}
