import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Building, Users, MapPin, TrendingUp, Download } from 'lucide-react';
import { useTranslation } from '../translations';
import data from '../assets/data.json';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function AnalyticsPage({ businessCenters, language = 'ru' }) {
  const { t } = useTranslation(language);
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedBuildingType, setSelectedBuildingType] = useState('all');

  // Use businessCenters prop if provided, otherwise use imported data
  const dataSource = businessCenters || data;

  const analytics = useMemo(() => {
    let filteredData = dataSource;

    if (selectedDistrict !== 'all') {
      filteredData = filteredData.filter(bc => bc.district === selectedDistrict);
    }

    if (selectedBuildingType !== 'all') {
      filteredData = filteredData.filter(bc => bc.building_purpose === selectedBuildingType);
    }

    const totalBusinessCenters = filteredData.length;
    const totalCompanies = filteredData.reduce((sum, bc) => sum + bc.companies.length, 0);
    const ktClients = filteredData.reduce((sum, bc) => 
      sum + bc.companies.filter(company => company.is_kt_client).length, 0
    );
    const totalRevenue = filteredData.reduce((sum, bc) => 
      sum + bc.companies.reduce((companySum, company) => companySum + (company.accruals || 0), 0), 0
    );

    const districtStats = {};
    filteredData.forEach(bc => {
      if (!districtStats[bc.district]) {
        districtStats[bc.district] = { 
          businessCenters: 0, 
          companies: 0, 
          ktClients: 0,
          revenue: 0
        };
      }
      districtStats[bc.district].businessCenters++;
      districtStats[bc.district].companies += bc.companies.length;
      districtStats[bc.district].ktClients += bc.companies.filter(c => c.is_kt_client).length;
      districtStats[bc.district].revenue += bc.companies.reduce((sum, c) => sum + (c.accruals || 0), 0);
    });

    const districtData = Object.entries(districtStats).map(([district, stats]) => ({
      district,
      ...stats
    }));

    const buildingTypeStats = {};
    filteredData.forEach(bc => {
      if (!buildingTypeStats[bc.building_purpose]) {
        buildingTypeStats[bc.building_purpose] = { 
          count: 0, 
          companies: 0,
          ktClients: 0
        };
      }
      buildingTypeStats[bc.building_purpose].count++;
      buildingTypeStats[bc.building_purpose].companies += bc.companies.length;
      buildingTypeStats[bc.building_purpose].ktClients += bc.companies.filter(c => c.is_kt_client).length;
    });

    const buildingTypeData = Object.entries(buildingTypeStats).map(([type, stats]) => ({
      type,
      ...stats
    }));

    const topBusinessCenters = filteredData
      .map(bc => ({
        name: bc.business_center_name,
        companies: bc.companies.length,
        ktClients: bc.companies.filter(c => c.is_kt_client).length,
        revenue: bc.companies.reduce((sum, c) => sum + (c.accruals || 0), 0)
      }))
      .sort((a, b) => b.companies - a.companies)
      .slice(0, 10);

    const allKtClients = [];
    filteredData.forEach(bc => {
      bc.companies.forEach(company => {
        if (company.is_kt_client) {
          allKtClients.push({
            name: company.organization_name,
            revenue: company.accruals || 0,
            services: company.services ? company.services.length : 0,
            businessCenter: bc.business_center_name
          });
        }
      });
    });

    const topKtClients = allKtClients
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const lowPenetrationBCs = filteredData
      .map(bc => {
        const total = bc.companies.length;
        const kt = bc.companies.filter(c => c.is_kt_client).length;
        const percent = total > 0 ? (kt / total) * 100 : 0;
        return {
          name: bc.business_center_name,
          district: bc.district,
          totalCompanies: total,
          ktClients: kt,
          penetration: percent.toFixed(1)
        };
      })
      .filter(bc => bc.ktClients > 0 && bc.ktClients < bc.totalCompanies)
      .sort((a, b) => a.penetration - b.penetration)
      .slice(0, 10);

    return {
      totalBusinessCenters,
      totalCompanies,
      ktClients,
      totalRevenue,
      districtData,
      buildingTypeData,
      topBusinessCenters,
      topKtClients,
      lowPenetrationBCs,
    };
  }, [selectedDistrict, selectedBuildingType, dataSource]);

  const districts = [...new Set(dataSource.map(bc => bc.district))];
  const buildingTypes = [...new Set(dataSource.map(bc => bc.building_purpose))];

  const exportData = () => {
    const csvContent = [
      [t('businessCenter'), t('distributionByDistricts'), t('buildingTypes'), t('companies'), t('ktClients'), 'Доходы'],
      ...dataSource.map(bc => [
        bc.business_center_name,
        bc.district,
        bc.building_purpose,
        bc.companies.length,
        bc.companies.filter(c => c.is_kt_client).length,
        bc.companies.reduce((sum, c) => sum + (c.accruals || 0), 0)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'business_centers_analytics.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('analyticsTitle')}
          </h1>
          <p className="text-gray-600">
            {t('analyticsDescription')}
          </p>
        </div>

        <div className="mb-6 flex gap-4 flex-wrap">
          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('selectDistrict')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allDistricts')}</SelectItem>
              {districts.map(district => (
                <SelectItem key={district} value={district}>{district}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedBuildingType} onValueChange={setSelectedBuildingType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('selectBuildingType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTypes')}</SelectItem>
              {buildingTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={exportData} variant="outline" className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            {t('exportCsv')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('businessCenters')}</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalBusinessCenters}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('companies')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalCompanies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('ktClients')}</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{analytics.ktClients}</div>
              <p className="text-xs text-muted-foreground">
                {((analytics.ktClients / analytics.totalCompanies) * 100).toFixed(1)}% {t('fromTotal')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalRevenue.toLocaleString()} {t('currency')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('distributionByDistricts')}</CardTitle>
              <CardDescription>{t('distributionDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.districtData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="district" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="businessCenters" fill="#8884d8" name={t('bcAbbr')} />
                  <Bar dataKey="companies" fill="#82ca9d" name={t('companiesChart')} />
                  <Bar dataKey="ktClients" fill="#ffc658" name={t('ktClientsChart')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('buildingTypes')}</CardTitle>
              <CardDescription>{t('buildingTypesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.buildingTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, count }) => `${type}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.buildingTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top lists and low penetration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('topBusinessCenters')}</CardTitle>
              <CardDescription>{t('topBusinessCentersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topBusinessCenters.map((bc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{bc.name}</div>
                      <div className="text-sm text-gray-600">
                        {bc.companies} {t('companies')} • {bc.ktClients} {t('ktClients')}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {bc.revenue.toLocaleString()} {t('currency')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('topKtClients')}</CardTitle>
              <CardDescription>{t('topKtClientsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topKtClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-gray-600">
                        {client.businessCenter} • {client.services} {t('services')}
                      </div>
                    </div>
                    <Badge variant="default" className="bg-blue-600">
                      {client.revenue.toLocaleString()} {t('currency')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('lowPenetrationBCs')}</CardTitle>
              <CardDescription>{t('lowPenetrationDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.lowPenetrationBCs.map((bc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <div className="font-medium">{bc.name}</div>
                      <div className="text-sm text-gray-600">
                        {bc.district} • {bc.ktClients} из {bc.totalCompanies} {t('companies')} — {bc.penetration}% {t('ktFilter')}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {bc.penetration}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;

