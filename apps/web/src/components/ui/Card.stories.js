"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelGraphStyled = exports.WithBadge = exports.Default = void 0;
const Card_1 = require("./Card");
const Button_1 = require("./Button");
const Badge_1 = require("./Badge");
const meta = {
    title: 'UI/Card',
    component: Card_1.Card,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};
exports.default = meta;
exports.Default = {
    render: () => (<Card_1.Card className="w-[350px]">
      <Card_1.CardHeader>
        <Card_1.CardTitle>Card Title</Card_1.CardTitle>
        <Card_1.CardDescription>
          Card description. Lorem ipsum dolor sit amet, consectetur adipiscing
          elit.
        </Card_1.CardDescription>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <p>Card content goes here.</p>
      </Card_1.CardContent>
      <Card_1.CardFooter>
        <Button_1.Button>Action</Button_1.Button>
      </Card_1.CardFooter>
    </Card_1.Card>),
};
exports.WithBadge = {
    render: () => (<Card_1.Card className="w-[350px]">
      <Card_1.CardHeader>
        <div className="flex items-center justify-between">
          <Card_1.CardTitle>Investigation #001</Card_1.CardTitle>
          <Badge_1.Badge variant="success">Active</Badge_1.Badge>
        </div>
        <Card_1.CardDescription>
          Network security analysis and threat detection investigation
        </Card_1.CardDescription>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entities:</span>
            <span>12</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Relationships:</span>
            <span>8</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Priority:</span>
            <Badge_1.Badge variant="warning" className="text-xs">
              High
            </Badge_1.Badge>
          </div>
        </div>
      </Card_1.CardContent>
    </Card_1.Card>),
};
exports.IntelGraphStyled = {
    render: () => (<Card_1.Card className="w-[350px] intel-gradient text-white border-intel-600">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="text-white">🔍 Active Investigation</Card_1.CardTitle>
        <Card_1.CardDescription className="text-intel-100">
          Real-time intelligence analysis in progress
        </Card_1.CardDescription>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        <div className="space-y-3">
          <div className="cyber-glow p-3 rounded-lg bg-white/10 backdrop-blur-sm">
            <div className="text-sm font-medium">Threat Level</div>
            <div className="text-2xl font-bold text-yellow-300">MEDIUM</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/10 p-2 rounded">
              <div className="text-intel-200">Entities</div>
              <div className="font-bold">24</div>
            </div>
            <div className="bg-white/10 p-2 rounded">
              <div className="text-intel-200">Alerts</div>
              <div className="font-bold">3</div>
            </div>
          </div>
        </div>
      </Card_1.CardContent>
    </Card_1.Card>),
};
