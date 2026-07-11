// Single in-memory snapshot of the shared server state. Shape:
// { me:{id,name,display}, wedDate, checks:{key:{done,by,byId,at}},
//   vendors:[{id,...,by,byId,at}], guests:[{id,...,by,byId,at}], picks:{key:{by,byId,at}}, rev }
export const store = { data: null }

export function setData(d) {
  store.data = d
}

// Merge the server's returned rev after a mutation so the next poll is a cheap no-op.
export function bumpRev(res) {
  if (store.data && res && res.rev != null) store.data.rev = res.rev
  return res
}

export const meId = () => store.data?.me?.id ?? null
