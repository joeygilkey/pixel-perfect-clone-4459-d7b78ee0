export interface CustomerInputs {
  reps: number | null;
  annualCostPerRep: number | null;
  dialsPerDay: number | null;
  connectRate: number | null;
  conversationRate: number | null;
  meetingRate: number | null;
}

export interface TitanXInputs {
  highIntent: number | null;
  highIntentReach: number | null;
  avgPhones: number | null;
  titanxConnectRate: number | null;
  creditPriceGrow: number | null;
  creditPriceAccelerate: number | null;
  creditPriceScale: number | null;
  multipleGrow: number | null;
  multipleAccelerate: number | null;
  multipleScale: number | null;
}

export interface TierResults {
  monthlyDials: number;
  monthlyConnects: number;
  monthlyConversations: number;
  monthlyMeetings: number;
  annualMeetings: number;
  creditsPerMonth: number;
  costMonthly: number;
  costAnnual: number;
  totalAnnualCost: number;
  costPerConnect: number;
  costPerMeeting: number;
  repProductionEquivalent: number;
  costOfEquivReps: number;
  pctOfCurrentDials: number;
}

export interface CurrentState {
  monthlyDials: number;
  monthlyConnects: number;
  monthlyConversations: number;
  monthlyMeetings: number;
  annualMeetings: number;
  annualCostReps: number;
  costPerConnect: number;
  costPerMeeting: number;
}

export interface CalculationResults {
  currentState: CurrentState;
  blended: { grow: TierResults; accelerate: TierResults; scale: TierResults };
  highIntent: { grow: TierResults; accelerate: TierResults; scale: TierResults };
}

const WORKING_DAYS = 20;


function mround(value: number, multiple: number): number {
  return Math.round(value / multiple) * multiple;
}

function allInputsValid(c: CustomerInputs, t: TitanXInputs): boolean {
  return (
    c.reps != null && c.reps > 0 &&
    c.annualCostPerRep != null && c.annualCostPerRep > 0 &&
    c.dialsPerDay != null && c.dialsPerDay > 0 &&
    c.connectRate != null && c.connectRate > 0 &&
    c.conversationRate != null && c.conversationRate > 0 &&
    c.meetingRate != null && c.meetingRate > 0 &&
    t.highIntent != null && t.highIntent > 0 &&
    t.highIntentReach != null && t.highIntentReach > 0 &&
    t.avgPhones != null && t.avgPhones > 0 &&
    t.titanxConnectRate != null && t.titanxConnectRate > 0 &&
    t.creditPriceGrow != null && t.creditPriceGrow > 0 &&
    t.creditPriceAccelerate != null && t.creditPriceAccelerate > 0 &&
    t.creditPriceScale != null && t.creditPriceScale > 0 &&
    t.multipleGrow != null && t.multipleGrow > 0 &&
    t.multipleAccelerate != null && t.multipleAccelerate > 0 &&
    t.multipleScale != null && t.multipleScale > 0
  );
}

export function calculate(c: CustomerInputs, t: TitanXInputs): CalculationResults | null {
  if (!allInputsValid(c, t)) return null;

  const reps = c.reps!;
  const annualCostPerRep = c.annualCostPerRep!;
  const dialsPerDay = c.dialsPerDay!;
  const connectRate = c.connectRate! / 100;
  const conversationRate = c.conversationRate! / 100;
  const meetingRate = c.meetingRate! / 100;
  const highIntent = t.highIntent! / 100;
  const highIntentReach = t.highIntentReach! / 100;
  const avgPhones = t.avgPhones!;
  const titanxCR = t.titanxConnectRate! / 100;
  const creditPrices = {
    grow: t.creditPriceGrow!,
    accelerate: t.creditPriceAccelerate!,
    scale: t.creditPriceScale!,
  };
  const multiples = {
    grow: t.multipleGrow!,
    accelerate: t.multipleAccelerate!,
    scale: t.multipleScale!,
  };

  // Current State
  const monthlyDials = reps * dialsPerDay * WORKING_DAYS;
  const monthlyConnects = monthlyDials * connectRate;
  const monthlyConversations = monthlyConnects * conversationRate;
  const monthlyMeetings = monthlyConversations * meetingRate;
  const annualMeetings = monthlyMeetings * 12;
  const annualCostReps = reps * annualCostPerRep;
  const costPerConnect = annualCostReps / (monthlyConnects * 12);
  const costPerMeeting = annualCostReps / (monthlyMeetings * 12);

  const currentState: CurrentState = {
    monthlyDials, monthlyConnects, monthlyConversations,
    monthlyMeetings, annualMeetings, annualCostReps,
    costPerConnect, costPerMeeting,
  };

  function calcBlended(tier: 'grow' | 'accelerate' | 'scale'): TierResults {
    const multiple = multiples[tier];
    const creditPrice = creditPrices[tier];
    const connectTarget = monthlyConnects * multiple;

    // HI share formula derived from spreadsheet constraint
    const hiShare = multiple / (1 + multiple * (1 - connectRate / titanxCR));
    const hiConnects = connectTarget * hiShare;
    const liConnects = connectTarget - hiConnects;
    const hiDials = hiConnects / titanxCR;
    const liDials = liConnects / connectRate;
    const totalDials = hiDials + liDials;

    const conversations = connectTarget * conversationRate;
    const meetings = conversations * meetingRate;
    const annMeetings = meetings * 12;

    // Credits: based on HI contacts needed
    const contactsRequired = hiConnects / (highIntent * highIntentReach);
    const creditsPerMonth = mround(contactsRequired * avgPhones * 3, 1000);
    const costMo = creditsPerMonth * creditPrice;
    const costAnn = creditsPerMonth * 12 * creditPrice;
    const totalAnnual = annualCostReps + costAnn;

    return {
      monthlyDials: totalDials,
      monthlyConnects: connectTarget,
      monthlyConversations: conversations,
      monthlyMeetings: meetings,
      annualMeetings: annMeetings,
      creditsPerMonth,
      costMonthly: costMo,
      costAnnual: costAnn,
      totalAnnualCost: totalAnnual,
      costPerConnect: totalAnnual / (connectTarget * 12),
      costPerMeeting: totalAnnual / (meetings * 12),
      repProductionEquivalent: reps * multiple,
      costOfEquivReps: costAnn / annualCostPerRep,
      pctOfCurrentDials: totalDials / monthlyDials,
    };
  }

  function calcHI(tier: 'grow' | 'accelerate' | 'scale'): TierResults {
    const multiple = MULTIPLES[tier];
    const creditPrice = creditPrices[tier];
    const connectTarget = monthlyConnects * multiple;
    const dialsRequired = connectTarget / titanxCR;

    const conversations = connectTarget * conversationRate;
    const meetings = conversations * meetingRate;
    const annMeetings = meetings * 12;

    const contactsRequired = connectTarget / (highIntent * highIntentReach);
    const creditsPerMonth = mround(contactsRequired * avgPhones * 3, 1000);
    const costMo = creditsPerMonth * creditPrice;
    const costAnn = creditsPerMonth * 12 * creditPrice;
    const totalAnnual = annualCostReps + costAnn;

    return {
      monthlyDials: dialsRequired,
      monthlyConnects: connectTarget,
      monthlyConversations: conversations,
      monthlyMeetings: meetings,
      annualMeetings: annMeetings,
      creditsPerMonth,
      costMonthly: costMo,
      costAnnual: costAnn,
      totalAnnualCost: totalAnnual,
      costPerConnect: totalAnnual / (connectTarget * 12),
      costPerMeeting: totalAnnual / (meetings * 12),
      repProductionEquivalent: reps * multiple,
      costOfEquivReps: costAnn / annualCostPerRep,
      pctOfCurrentDials: dialsRequired / monthlyDials,
    };
  }

  return {
    currentState,
    blended: { grow: calcBlended('grow'), accelerate: calcBlended('accelerate'), scale: calcBlended('scale') },
    highIntent: { grow: calcHI('grow'), accelerate: calcHI('accelerate'), scale: calcHI('scale') },
  };
}
