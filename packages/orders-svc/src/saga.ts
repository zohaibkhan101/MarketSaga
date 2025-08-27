export type SagaState = 'NEW'|'INVENTORY_RESERVED'|'PAYMENT_CHARGED'|'CONFIRMED'|'FAILED'
export type Event =
  | { type:'RESERVE_OK' }
  | { type:'RESERVE_FAIL'; reason:string }
  | { type:'CHARGE_OK' }
  | { type:'CHARGE_FAIL'; reason:string }
export function reduce(state: SagaState, evt: Event): SagaState {
  switch(state){
    case 'NEW':
      if (evt.type==='RESERVE_OK') return 'INVENTORY_RESERVED'
      if (evt.type==='RESERVE_FAIL') return 'FAILED'
      return state
    case 'INVENTORY_RESERVED':
      if (evt.type==='CHARGE_OK') return 'PAYMENT_CHARGED'
      if (evt.type==='CHARGE_FAIL') return 'FAILED'
      return state
    case 'PAYMENT_CHARGED':
      return 'CONFIRMED'
    default:
      return state
  }
}
