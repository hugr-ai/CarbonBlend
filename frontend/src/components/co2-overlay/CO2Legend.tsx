export function CO2Legend() {
  return (
    <div className="absolute bottom-8 left-4 bg-surface/90 backdrop-blur-sm border border-border rounded-lg p-3 z-10">
      <div className="text-xs font-semibold text-text-secondary mb-2">
        CO2 Content
      </div>
      <div className="flex items-stretch gap-2">
        <div
          className="w-3 rounded-full"
          style={{
            background: 'linear-gradient(to bottom, #ff6b6b, #fcc419, #51cf66)',
            minHeight: 80,
          }}
        />
        <div className="flex flex-col justify-between text-[10px] text-text-secondary">
          <span>5%+ mol</span>
          <div className="flex items-center gap-1">
            <span className="text-warning font-semibold">2.5% limit</span>
            <div className="w-4 border-t border-dashed border-warning" />
          </div>
          <span>0% mol</span>
        </div>
      </div>
    </div>
  );
}
