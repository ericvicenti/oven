/*
 * @flow
 */

type OString = {
  type: 'OString',
  value: string,
};

type ONumber = {
  type: 'ONumber',
  value: number,
};

type OBoolean = {
  type: 'OBoolean',
  value: boolean,
};

type Item = {
  type: string,
};

type BooleanExpression = {
  comingSoon: true,
};

type BooleanValue = boolean | BooleanExpression;

type BooleanItem = {
  type: 'Boolean',
  value: boolean | BooleanExpression,
};


export default function EvalBooleanExpression() {

  return null;
}
